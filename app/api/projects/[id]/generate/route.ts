import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/utils/auth";
import { createSSEStream } from "@/lib/streaming/sse";
import { runOrchestrator, executeDAG } from "@/lib/agents/orchestrator";
import { createAdminClient } from "@/lib/supabase/admin";
import { createServerClient } from "@/lib/supabase/server";

const Schema = z.object({
  prompt:         z.string().min(10).max(5000),
  routingProfile: z.enum(["free_tier","balanced","fast_build","quality"]).default("balanced"),
  freeTierFirst:  z.boolean().default(true),
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireAuth(req);
  if (!user) return new Response("Unauthorized", { status: 401 });

  const body = await req.json().catch(() => ({}));
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return new Response("Invalid input", { status: 400 });

  const supabase = createServerClient();
  const { data: project } = await supabase.from("projects").select().eq("id", params.id).eq("user_id", user.id).single();
  if (!project) return new Response("Not found", { status: 404 });

  return createSSEStream(async (emit) => {
    const admin = createAdminClient();

    // Mark project as generating
    await admin.from("projects").update({ status: "generating" }).eq("id", params.id);

    const { data: run } = await admin.from("agent_runs").insert({
      project_id: params.id,
      status: "running",
      trigger: "user",
      started_at: new Date().toISOString(),
    }).select().single();

    emit({ type: "run.started", runId: run.id });

    const providerConfig = {
      routingProfile: parsed.data.routingProfile,
      freeTierFirst: parsed.data.freeTierFirst,
      fastRepair: false,
      qualityMode: false,
    };

    try {
      emit({ type: "agent.started", agent: "orchestrator" });

      const plan = await runOrchestrator(parsed.data.prompt, {
        projectId: params.id, runId: run.id, userId: user.id,
        taskId: "orchestrator-0", inputs: { userPrompt: parsed.data.prompt }, providerConfig,
      });

      emit({ type: "agent.completed", agent: "orchestrator", taskCount: plan.output.tasks.length });

      // Persist tasks to DB
      if (plan.output.tasks.length > 0) {
        await admin.from("tasks").insert(
          plan.output.tasks.map(t => ({
            run_id: run.id, project_id: params.id,
            title: t.title, description: t.description,
            assigned_agent: t.assigned_agent, status: "pending",
            priority: t.priority, dependencies: t.dependencies,
            input_refs: t.input_refs, output_refs: t.output_refs,
            errors: t.errors, retry_count: 0, max_retries: t.max_retries,
          }))
        );
      }

      // Emit task start events
      for (const task of plan.output.tasks) {
        emit({ type: "task.queued", agent: task.assigned_agent, title: task.title });
      }

      // Execute the DAG
      await executeDAG(plan.output, { projectId: params.id, runId: run.id, userId: user.id, providerConfig });

      // Mark complete
      await admin.from("agent_runs").update({ status: "completed", completed_at: new Date().toISOString() }).eq("id", run.id);
      await admin.from("projects").update({ status: "ready", updated_at: new Date().toISOString() }).eq("id", params.id);

      // Create a version snapshot
      const { data: latestVersion } = await admin.from("project_versions")
        .select("version_num").eq("project_id", params.id).order("version_num", { ascending: false }).limit(1).single();
      const nextNum = (latestVersion?.version_num ?? 0) + 1;
      await admin.from("project_versions").insert({
        project_id: params.id, version_num: nextNum,
        label: `v${nextNum} — ${new Date().toLocaleString()}`,
        created_by: user.id, snapshot: { taskCount: plan.output.tasks.length },
      });

      emit({ type: "run.completed", runId: run.id });
    } catch (err) {
      await admin.from("agent_runs").update({ status: "failed", error: String(err) }).eq("id", run.id);
      await admin.from("projects").update({ status: "error" }).eq("id", params.id);
      emit({ type: "run.failed", error: String(err) });
    }
  });
}
