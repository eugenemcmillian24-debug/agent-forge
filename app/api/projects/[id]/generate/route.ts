import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/utils/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createSSEStream } from "@/lib/streaming/sse";
import { rateLimit } from "@/lib/rate-limit";
import { runOrchestrator, executeDAG } from "@/lib/agents/orchestrator";
import type { AgentContext } from "@/types/agent";

const GenerateSchema = z.object({
  prompt:         z.string().min(10).max(4000),
  routingProfile: z.enum(["free_tier", "balanced", "fast_build", "quality"]).default("balanced"),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAuth(req);
  if (!user) return NextResponse.json({ data: null, error: "Unauthorized" }, { status: 401 });

  const { id: projectId } = await params;

  const rl = rateLimit(`gen:${user.id}`, { limit: 5, windowMs: 10 * 60 * 1000 });
  if (!rl.success) {
    return NextResponse.json(
      { data: null, error: "Rate limit exceeded — try again shortly" },
      { status: 429, headers: { "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } }
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = GenerateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ data: null, error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }
  const { prompt, routingProfile } = parsed.data;

  const admin = createAdminClient();

  const { data: project, error: projectError } = await admin
    .from("projects")
    .select("id, user_id, status, metadata")
    .eq("id", projectId)
    .eq("user_id", user.id)
    .single();

  if (projectError || !project) {
    return NextResponse.json({ data: null, error: "Project not found" }, { status: 404 });
  }

  const { data: providerConfig } = await admin
    .from("provider_configs")
    .select("*")
    .eq("user_id", user.id)
    .single();

  const resolvedConfig = {
    routingProfile: (providerConfig?.routing_profile ?? routingProfile) as
      "free_tier" | "balanced" | "fast_build" | "quality",
    freeTierFirst: providerConfig?.free_tier_first ?? true,
    fastRepair:    providerConfig?.fast_repair      ?? false,
    qualityMode:   providerConfig?.quality_mode     ?? false,
  };

  return createSSEStream(async (emit) => {
    const { data: run, error: runError } = await admin
      .from("agent_runs")
      .insert({
        project_id: projectId,
        status:     "running",
        trigger:    "user",
        started_at: new Date().toISOString(),
        metadata:   { prompt, routingProfile: resolvedConfig.routingProfile },
      })
      .select()
      .single();

    if (runError || !run) { emit({ type: "error", message: "Failed to create run" }); return; }

    const runId = run.id as string;

    await admin.from("projects").update({ status: "generating" }).eq("id", projectId);
    emit({ type: "run.started", runId, projectId });

    try {
      const baseCtx: Omit<AgentContext, "taskId" | "inputs"> = {
        projectId, runId, userId: user.id, providerConfig: resolvedConfig,
      };

      emit({ type: "agent.started", agent: "orchestrator" });

      const orchestratorCtx: AgentContext = {
        ...baseCtx,
        taskId: runId,
        inputs: { userPrompt: prompt },
      };

      const orchestratorResult = await runOrchestrator(prompt, orchestratorCtx);
      const plan = orchestratorResult.output;

      emit({
        type: "agent.completed", agent: "orchestrator",
        provider: orchestratorResult.metadata.provider,
        model: orchestratorResult.metadata.model,
        tokens_used: orchestratorResult.metadata.tokens_used,
        estimated_files: plan.estimated_files,
        task_count: plan.tasks.length,
      });

      // ── Two-phase task insert ─────────────────────────────────────────────
      // Phase 1: insert without dependencies to obtain DB UUIDs
      const taskRows = plan.tasks.map((t) => ({
        run_id: runId, project_id: projectId,
        title: t.title, description: t.description,
        assigned_agent: t.assigned_agent,
        status: "pending" as const, priority: t.priority,
        dependencies: [] as string[],
        input_refs: t.input_refs ?? [], output_refs: t.output_refs ?? [],
        errors: [], retry_count: 0, max_retries: 3,
      }));

      const { data: insertedTasks, error: insertError } = await admin
        .from("tasks").insert(taskRows).select("id, title, assigned_agent");

      if (insertError || !insertedTasks) {
        throw new Error(`Failed to insert tasks: ${insertError?.message}`);
      }

      // Build plan-UUID → DB-UUID map via title matching
      const titleToDbId = new Map<string, string>(
        insertedTasks.map((row) => [row.title as string, row.id as string])
      );
      const planIdToDbId = new Map<string, string>();
      for (const planTask of plan.tasks) {
        const dbId = titleToDbId.get(planTask.title);
        if (dbId) planIdToDbId.set(planTask.id, dbId);
      }

      // Phase 2: write translated dependency UUIDs
      await Promise.all(
        plan.tasks.map(async (planTask) => {
          const dbId = planIdToDbId.get(planTask.id);
          if (!dbId) return;
          const translatedDeps = (planTask.dependencies ?? [])
            .map((depPlanId) => planIdToDbId.get(depPlanId))
            .filter((id): id is string => !!id);
          if (translatedDeps.length > 0) {
            await admin.from("tasks").update({ dependencies: translatedDeps }).eq("id", dbId);
          }
        })
      );

      emit({ type: "tasks.seeded", count: insertedTasks.length });

      // ── Poll for task status changes while DAG runs ───────────────────────
      let lastEmittedStatuses: Record<string, string> = {};
      const pollInterval = setInterval(async () => {
        const { data: currentTasks } = await admin
          .from("tasks")
          .select("id, title, assigned_agent, status, provider, model, tokens_used, latency_ms")
          .eq("run_id", runId);
        if (!currentTasks) return;
        for (const task of currentTasks) {
          const prev = lastEmittedStatuses[task.id as string];
          if (prev !== task.status) {
            lastEmittedStatuses[task.id as string] = task.status as string;
            emit({ type: `task.${task.status}`, taskId: task.id, title: task.title,
              agent: task.assigned_agent, status: task.status,
              provider: task.provider, model: task.model,
              tokens_used: task.tokens_used, latency_ms: task.latency_ms });
          }
        }
      }, 1500);

      try {
        await executeDAG(plan, baseCtx);
      } finally {
        clearInterval(pollInterval);
      }

      // ── Final snapshot ────────────────────────────────────────────────────
      const { data: finalTasks } = await admin
        .from("tasks").select("id, title, assigned_agent, status, provider, model, tokens_used, latency_ms, errors")
        .eq("run_id", runId);

      const failedTasks = (finalTasks ?? []).filter((t) => t.status === "failed");
      const allCompleted = failedTasks.length === 0;

      // ── Version snapshot ──────────────────────────────────────────────────
      if (allCompleted) {
        const { data: files } = await admin
          .from("project_files").select("id, path, language, agent_id")
          .eq("project_id", projectId).eq("is_deleted", false);

        const { data: latestVersion } = await admin
          .from("project_versions").select("version_num")
          .eq("project_id", projectId).order("version_num", { ascending: false }).limit(1).single();

        const nextVersionNum = ((latestVersion?.version_num as number) ?? 0) + 1;

        const { data: newVersion } = await admin
          .from("project_versions")
          .insert({
            project_id: projectId, version_num: nextVersionNum,
            label: `v${nextVersionNum} — ${new Date().toLocaleDateString()}`,
            snapshot: { prompt, file_count: files?.length ?? 0,
              file_paths: (files ?? []).map((f) => f.path), run_id: runId },
            created_by: user.id,
          })
          .select().single();

        if (newVersion) {
          await admin.from("project_files")
            .update({ version_id: newVersion.id })
            .eq("project_id", projectId).is("version_id", null).eq("is_deleted", false);

          await admin.from("projects")
            .update({ status: "ready", current_version_id: newVersion.id })
            .eq("id", projectId);

          emit({ type: "version.created", versionId: newVersion.id,
            versionNum: nextVersionNum, file_count: files?.length ?? 0 });
        }
      } else {
        await admin.from("projects").update({ status: "error" }).eq("id", projectId);
      }

      await admin.from("agent_runs").update({
        status: allCompleted ? "completed" : "failed",
        completed_at: new Date().toISOString(),
        error: allCompleted ? null
          : `${failedTasks.length} task(s) failed: ${failedTasks.map((t) => t.assigned_agent).join(", ")}`,
      }).eq("id", runId);

      emit({ type: allCompleted ? "run.completed" : "run.failed", runId, tasks: finalTasks,
        error: allCompleted ? null : `${failedTasks.length} task(s) failed` });

    } catch (err) {
      const message = String(err);
      await admin.from("agent_runs")
        .update({ status: "failed", error: message, completed_at: new Date().toISOString() })
        .eq("id", runId);
      await admin.from("projects").update({ status: "error" }).eq("id", projectId);
      emit({ type: "run.failed", runId, error: message });
    }
  });
}
