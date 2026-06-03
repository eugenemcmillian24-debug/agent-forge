import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/utils/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createSSEStream } from "@/lib/streaming/sse";
import { rateLimit } from "@/lib/rate-limit";
import { runQA } from "@/lib/agents/qa";
import { runRepair } from "@/lib/agents/repair";
import type { AgentContext } from "@/types/agent";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAuth(req);
  if (!user) return NextResponse.json({ data: null, error: "Unauthorized" }, { status: 401 });

  const { id: projectId } = await params;

  const rl = rateLimit(`repair:${user.id}`, { limit: 10, windowMs: 10 * 60 * 1000 });
  if (!rl.success) return NextResponse.json({ data: null, error: "Rate limit exceeded" }, { status: 429 });

  const admin = createAdminClient();

  const { data: project } = await admin
    .from("projects").select("id, user_id, status, metadata")
    .eq("id", projectId).eq("user_id", user.id).single();
  if (!project) return NextResponse.json({ data: null, error: "Project not found" }, { status: 404 });

  const { data: providerConfig } = await admin
    .from("provider_configs").select("*").eq("user_id", user.id).single();

  const resolvedConfig = {
    routingProfile: (providerConfig?.routing_profile ?? "balanced") as "free_tier" | "balanced" | "fast_build" | "quality",
    freeTierFirst: providerConfig?.free_tier_first ?? true,
    fastRepair:    true, // always fast for repair
    qualityMode:   false,
  };

  return createSSEStream(async (emit) => {
    // Create a repair run
    const { data: run } = await admin.from("agent_runs").insert({
      project_id: projectId, status: "running", trigger: "repair",
      started_at: new Date().toISOString(), metadata: {},
    }).select().single();

    if (!run) { emit({ type: "error", message: "Failed to create repair run" }); return; }

    const runId = run.id as string;
    emit({ type: "repair.started", runId });

    try {
      // Load all current project files
      const { data: projectFiles } = await admin
        .from("project_files")
        .select("path, content, language")
        .eq("project_id", projectId).eq("is_deleted", false);

      const files = (projectFiles ?? []).map((f) => ({
        path: f.path as string,
        content: (f.content ?? "") as string,
      }));

      const baseCtx = { projectId, runId, userId: user.id, providerConfig: resolvedConfig };

      // Step 1: QA pass
      emit({ type: "agent.started", agent: "qa" });
      const qaCtx: AgentContext = { ...baseCtx, taskId: `${runId}-qa`, inputs: { files } };
      const qaResult = await runQA(qaCtx);

      emit({
        type: "agent.completed", agent: "qa",
        passed: qaResult.output.passed,
        repair_needed: qaResult.output.repair_needed,
        check_count: qaResult.output.checks.length,
        error_count: qaResult.output.errors.length,
      });

      if (!qaResult.output.repair_needed) {
        await admin.from("projects").update({ status: "ready" }).eq("id", projectId);
        await admin.from("agent_runs")
          .update({ status: "completed", completed_at: new Date().toISOString() }).eq("id", runId);
        emit({ type: "repair.completed", repaired: false, message: "No issues found — project is healthy" });
        return;
      }

      // Step 2: Repair pass
      emit({ type: "agent.started", agent: "repair" });
      const repairCtx: AgentContext = {
        ...baseCtx, taskId: `${runId}-repair`,
        inputs: { repairTasks: qaResult.output.repair_tasks, files },
      };
      const repairResult = await runRepair(repairCtx);

      emit({
        type: "agent.completed", agent: "repair",
        fixed_count: repairResult.output.fixed_files.length,
        unresolved_count: repairResult.output.unresolved.length,
      });

      const hasUnresolved = repairResult.output.unresolved.length > 0;
      const newStatus = hasUnresolved ? "error" : "ready";

      await admin.from("projects").update({ status: newStatus }).eq("id", projectId);
      await admin.from("agent_runs")
        .update({ status: "completed", completed_at: new Date().toISOString() }).eq("id", runId);

      emit({
        type: "repair.completed", repaired: true,
        fixed_count: repairResult.output.fixed_files.length,
        unresolved: repairResult.output.unresolved,
        project_status: newStatus,
      });

    } catch (err) {
      const message = String(err);
      await admin.from("agent_runs")
        .update({ status: "failed", error: message, completed_at: new Date().toISOString() }).eq("id", runId);
      emit({ type: "repair.failed", error: message });
    }
  });
}
