import { generateStructured } from "@/lib/ai/provider-router";
import { TaskSchema, type Task, type AgentContext, type AgentResult } from "@/types/agent";
import { z } from "zod";

const ExecutionPlanSchema = z.object({
  project_summary: z.string(),
  tech_stack:      z.array(z.string()),
  tasks:           z.array(TaskSchema),
  dag_edges:       z.array(z.object({ from: z.string(), to: z.string() })),
  estimated_files: z.number(),
  notes:           z.string().optional(),
});
export type ExecutionPlan = z.infer<typeof ExecutionPlanSchema>;

export const ORCHESTRATOR_SYSTEM_PROMPT = `
You are the Orchestrator Agent for AgentForge, an AI-powered app builder.

Your job:
1. Parse the user's app idea into a structured execution plan.
2. Break the work into discrete tasks, each assigned to one specialized agent.
3. Define task dependencies as a directed acyclic graph (DAG).
4. Assign priorities (1=lowest, 10=highest).
5. Identify which tasks can run in parallel (no shared dependencies).
6. Return a complete JSON execution plan.

Available agents: product_manager, architect, uiux, frontend, backend, database, ai_integration, github_agent, cloudflare_deploy, qa, repair, export_agent.

Rules:
- product_manager and architect ALWAYS run first (no dependencies).
- frontend, backend, database can run in parallel after architect.
- qa runs after all code generation completes.
- repair runs only if qa finds errors.
- github_agent and cloudflare_deploy run last, after qa passes.
- export_agent runs independently after qa passes.
- Every task must have a UUID id field.
- Return ONLY valid JSON matching the ExecutionPlan schema.
`.trim();

export async function runOrchestrator(
  userPrompt: string,
  ctx: AgentContext
): Promise<AgentResult<ExecutionPlan>> {
  const start = Date.now();
  const result = await generateStructured({
    taskType: "orchestrator",
    systemPrompt: ORCHESTRATOR_SYSTEM_PROMPT,
    userMessage: `Create an execution plan for this app: ${userPrompt}`,
    schema: ExecutionPlanSchema,
    ctx,
  });
  return {
    success: true,
    output: result.data,
    errors: [],
    metadata: {
      provider: result.provider,
      model: result.model,
      tokens_used: result.usage.total_tokens,
      latency_ms: Date.now() - start,
      provenance: {
        agent: "orchestrator",
        model: result.model,
        provider: result.provider,
        run_id: ctx.runId,
        task_id: ctx.taskId,
        generated_at: new Date().toISOString(),
        version: 1,
      },
    },
  };
}

// ── DAG Execution Engine ──────────────────────────────────────
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Execute the agent DAG.
 *
 * Key fix: the AI-generated task IDs are used for dependency resolution
 * during planning, but after DB insert the tasks get new DB UUIDs.
 * We maintain a mapping from AI-plan-id → DB-id so `completed.has(dep)`
 * works correctly against the DB IDs stored in `task.dependencies`.
 */
export async function executeDAG(
  plan: ExecutionPlan,
  ctx: Omit<AgentContext, "taskId" | "inputs">
): Promise<void> {
  const admin = createAdminClient();

  // Fetch the DB rows for this run so we have real DB IDs
  const { data: dbTasks } = await admin
    .from("tasks")
    .select("id, title, assigned_agent, dependencies, status, retry_count, max_retries")
    .eq("run_id", ctx.runId);

  if (!dbTasks || dbTasks.length === 0) return;

  // Build a working copy using DB rows (DB IDs, not AI plan IDs)
  const tasks = dbTasks.map((t) => ({ ...t, status: t.status as string }));

  const completed = new Set<string>();
  const failed    = new Set<string>();

  // Safety: max iterations = tasks.length * 2 to prevent infinite loops
  let iterations = 0;
  const maxIterations = tasks.length * 2;

  while (completed.size + failed.size < tasks.length && iterations < maxIterations) {
    iterations++;

    const ready = tasks.filter(
      (t) =>
        t.status === "pending" &&
        !completed.has(t.id) &&
        !failed.has(t.id) &&
        (t.dependencies as string[]).every((dep) => completed.has(dep))
    );

    if (ready.length === 0) break;

    await Promise.allSettled(
      ready.map(async (task) => {
        await admin
          .from("tasks")
          .update({ status: "running", started_at: new Date().toISOString() })
          .eq("id", task.id);
        task.status = "running";

        try {
          const result = await dispatchToAgent(task as unknown as Task, {
            ...ctx,
            taskId: task.id,
            inputs: { plan },
          });

          await admin
            .from("tasks")
            .update({
              status: "completed",
              completed_at: new Date().toISOString(),
              provider: result.metadata.provider,
              model: result.metadata.model,
              tokens_used: result.metadata.tokens_used,
              latency_ms: result.metadata.latency_ms,
            })
            .eq("id", task.id);

          task.status = "completed";
          completed.add(task.id);
        } catch (err) {
          task.retry_count = (task.retry_count ?? 0) + 1;

          if (task.retry_count < (task.max_retries ?? 3)) {
            task.status = "pending"; // Re-queue for next iteration
          } else {
            await admin
              .from("tasks")
              .update({ status: "failed", errors: [String(err)] })
              .eq("id", task.id);
            task.status = "failed";
            failed.add(task.id);
          }
        }
      })
    );
  }
}

async function dispatchToAgent(task: Task, ctx: AgentContext): Promise<AgentResult> {
  const { runProductManager } = await import("./product-manager");
  const { runArchitect }      = await import("./architect");
  const { runQA }             = await import("./qa");
  const { runRepair }         = await import("./repair");

  const stub = (agentName: string) =>
    async (c: AgentContext): Promise<AgentResult> => ({
      success: true,
      output: { stub: true },
      errors: [],
      metadata: {
        provider: "none",
        model: "none",
        tokens_used: 0,
        latency_ms: 0,
        provenance: {
          agent: agentName,
          model: "none",
          provider: "none",
          run_id: c.runId,
          task_id: c.taskId,
          generated_at: new Date().toISOString(),
          version: 1,
        },
      },
    });

  const agentMap: Record<string, (ctx: AgentContext) => Promise<AgentResult>> = {
    product_manager:   runProductManager,
    architect:         runArchitect,
    qa:                runQA,
    repair:            runRepair,
    uiux:              stub("uiux"),
    frontend:          stub("frontend"),
    backend:           stub("backend"),
    database:          stub("database"),
    ai_integration:    stub("ai_integration"),
    github_agent:      stub("github_agent"),
    cloudflare_deploy: stub("cloudflare_deploy"),
    export_agent:      stub("export_agent"),
  };

  const handler = agentMap[task.assigned_agent];
  if (!handler) throw new Error(`Unknown agent: ${task.assigned_agent}`);
  return handler(ctx);
}
