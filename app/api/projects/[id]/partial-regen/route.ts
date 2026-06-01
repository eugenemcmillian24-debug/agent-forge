import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/utils/auth";
import { createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createSSEStream } from "@/lib/streaming/sse";
import { runOrchestrator, executeDAG } from "@/lib/agents/orchestrator";
import { checkRateLimit } from "@/lib/utils/rate-limit";

const Schema = z.object({
  prompt:         z.string().min(5).max(2000),
  targetFiles:    z.array(z.string()).optional(),
  targetAgents:   z.array(z.string()).optional(),
  routingProfile: z.enum(["free_tier", "balanced", "fast_build", "quality"]).default("balanced"),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireAuth(req);
  if (!user) return new Response("Unauthorized", { status: 401 });

  const allowed = await checkRateLimit(user.id, "generate", 10, "1h");
  if (!allowed) return new Response("Rate limit exceeded", { status: 429 });

  const body   = await req.json().catch(() => ({}));
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return new Response("Invalid input", { status: 400 });

  const supabase = await createServerClient();
  const { data: project } = await supabase.from("projects").select().eq("id", id).eq("user_id", user.id).single();
  if (!project) return new Response("Not found", { status: 404 });

  return createSSEStream(async (emit) => {
    const admin = createAdminClient();
    await admin.from("projects").update({ status: "generating" }).eq("id", id);

    const { data: run } = await admin.from("agent_runs").insert({
      project_id: id,
      status: "running",
      trigger: "partial_regen",
      started_at: new Date().toISOString(),
      metadata: {
        targetFiles:  parsed.data.targetFiles  ?? [],
        targetAgents: parsed.data.targetAgents ?? [],
        prompt:       parsed.data.prompt,
      },
    }).select().single();

    if (!run) {
      await admin.from("projects").update({ status: "error" }).eq("id", id);
      emit({ type: "run.failed", error: "Failed to create agent run" });
      return;
    }

    emit({ type: "run.started", runId: run.id, trigger: "partial_regen" });

    const providerConfig = {
      routingProfile: parsed.data.routingProfile,
      freeTierFirst: true,
      fastRepair: false,
      qualityMode: false,
    };

    try {
      // Build a focused prompt: regenerate only the described change
      const focusedPrompt = parsed.data.targetFiles?.length
        ? `Partial regen — only update these files: ${parsed.data.targetFiles.join(", ")}.\n\nChange: ${parsed.data.prompt}`
        : parsed.data.prompt;

      emit({ type: "agent.started", agent: "orchestrator" });
      const plan = await runOrchestrator(focusedPrompt, {
        projectId: id, runId: run.id, userId: user.id,
        taskId: "orchestrator-0",
        inputs: { userPrompt: focusedPrompt, isPartialRegen: true, targetFiles: parsed.data.targetFiles },
        providerConfig,
      });
      emit({ type: "agent.completed", agent: "orchestrator", taskCount: plan.output.tasks.length });

      if (plan.output.tasks.length > 0) {
        await admin.from("tasks").insert(
          plan.output.tasks.map(t => ({
            run_id: run.id, project_id: id,
            title: t.title, description: t.description,
            assigned_agent: t.assigned_agent,
            status: "pending", priority: t.priority,
            dependencies: [], input_refs: t.input_refs,
            output_refs: t.output_refs, errors: t.errors,
            retry_count: 0, max_retries: t.max_retries,
          }))
        );
      }

      for (const task of plan.output.tasks) {
        emit({ type: "task.queued", agent: task.assigned_agent, title: task.title });
      }

      await executeDAG(plan.output, { projectId: id, runId: run.id, userId: user.id, providerConfig });

      const { count: fileCount } = await admin.from("project_files")
        .select("id", { count: "exact", head: true })
        .eq("project_id", id).eq("is_deleted", false);

      await admin.from("agent_runs").update({ status: "completed", completed_at: new Date().toISOString() }).eq("id", run.id);
      await admin.from("projects").update({ status: "ready", updated_at: new Date().toISOString() }).eq("id", id);

      const { data: latestVersion } = await admin.from("project_versions")
        .select("version_num").eq("project_id", id).order("version_num", { ascending: false }).limit(1).single();
      const nextNum = (latestVersion?.version_num ?? 0) + 1;
      await admin.from("project_versions").insert({
        project_id: id, version_num: nextNum,
        label: `v${nextNum} — partial regen`,
        created_by: user.id,
        snapshot: { fileCount: fileCount ?? 0, runId: run.id, trigger: "partial_regen", generatedAt: new Date().toISOString() },
      });

      emit({ type: "run.completed", runId: run.id });
    } catch (err) {
      await admin.from("agent_runs").update({ status: "failed", error: String(err) }).eq("id", run.id);
      await admin.from("projects").update({ status: "error" }).eq("id", id);
      emit({ type: "run.failed", error: String(err) });
    }
  });
}
