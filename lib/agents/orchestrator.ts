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
- uiux runs after product_manager (depends on product brief).
- frontend, backend, database, ai_integration can run in parallel after architect.
- github_agent and cloudflare_deploy run after architect (generate config files).
- export_agent runs after product_manager and architect.
- qa runs after all code generation completes.
- repair runs only if qa finds errors.
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
 * Key fixes applied:
 *
 * 1. Two-phase ID mapping: AI-generated task IDs are used for dependency
 *    resolution during planning, but after DB insert the tasks get new DB UUIDs.
 *    We maintain a mapping from AI-plan-id → DB-id so `completed.has(dep)`
 *    works correctly against the DB IDs stored in `task.dependencies`.
 *
 * 2. QA file injection: before dispatching to the QA agent, we load all
 *    generated project_files and inject them into ctx.inputs.files so the
 *    QA agent reviews real code, not an empty list.
 *
 * 3. Dynamic repair trigger: after QA completes, if qaReport.repair_needed
 *    is true we inject a repair task and re-queue it — even if the orchestrator
 *    did not plan a repair task upfront.
 *
 * 4. Context passing: each agent receives outputs from completed dependency
 *    agents via ctx.inputs, enabling downstream agents to build on upstream work.
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

  // Accumulate agent outputs to pass as inputs to downstream agents
  const agentOutputs: Record<string, unknown> = { plan };

  // Safety: max iterations = tasks.length * 3 (extra headroom for injected repair task)
  let iterations = 0;
  const maxIterations = tasks.length * 3;

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
          // ── FIX 2: inject real project files for QA agent ──────────────
          let extraInputs: Record<string, unknown> = {};
          if (task.assigned_agent === "qa") {
            const { data: projectFiles } = await admin
              .from("project_files")
              .select("path, content, language")
              .eq("project_id", ctx.projectId)
              .eq("is_deleted", false);

            extraInputs.files = (projectFiles ?? []).map((f) => ({
              path:    f.path,
              content: f.content ?? "",
            }));
          }

          const result = await dispatchToAgent(task as unknown as Task, {
            ...ctx,
            taskId: task.id,
            inputs: {
              ...agentOutputs,
              productBrief:  agentOutputs.productBrief,
              architecture:  agentOutputs.architecture,
              designSystem:  agentOutputs.designSystem,
              ...extraInputs,
            },
          });

          // Store output for downstream agents
          const agentKey = getOutputKey(task.assigned_agent);
          if (agentKey) agentOutputs[agentKey] = result.output;

          await admin
            .from("tasks")
            .update({
              status:       "completed",
              completed_at: new Date().toISOString(),
              provider:     result.metadata.provider,
              model:        result.metadata.model,
              tokens_used:  result.metadata.tokens_used,
              latency_ms:   result.metadata.latency_ms,
            })
            .eq("id", task.id);

          task.status = "completed";
          completed.add(task.id);

          // ── FIX 3: dynamic repair trigger ──────────────────────────────
          // If QA flagged repair_needed, inject a repair task right now
          // rather than waiting for the orchestrator to have planned one.
          if (task.assigned_agent === "qa") {
            const qaReport = result.output as { repair_needed?: boolean; repair_tasks?: unknown[] };

            if (qaReport.repair_needed) {
              // Check if a repair task already exists for this run
              const { data: existingRepair } = await admin
                .from("tasks")
                .select("id")
                .eq("run_id", ctx.runId)
                .eq("assigned_agent", "repair")
                .single();

              if (!existingRepair) {
                // Inject a new repair task that depends on this QA task
                const { data: repairTask } = await admin
                  .from("tasks")
                  .insert({
                    run_id:         ctx.runId,
                    project_id:     ctx.projectId,
                    title:          "Repair — fix QA failures",
                    description:    "Automatically injected after QA found issues",
                    assigned_agent: "repair",
                    status:         "pending",
                    priority:       9,
                    dependencies:   [task.id], // depends on QA completing
                    input_refs:     [],
                    output_refs:    [],
                    errors:         [],
                    retry_count:    0,
                    max_retries:    3,
                  })
                  .select()
                  .single();

                if (repairTask) {
                  // Store repair tasks in agentOutputs so the repair agent can read them
                  agentOutputs.repairTasks = qaReport.repair_tasks ?? [];
                  tasks.push({ ...repairTask, status: "pending" });
                  console.log(`[dag] Injected repair task ${repairTask.id} after QA flagged issues`);
                }
              }
            }
          }

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

function getOutputKey(agent: string): string | null {
  const map: Record<string, string> = {
    product_manager:   "productBrief",
    architect:         "architecture",
    uiux:              "designSystem",
    frontend:          "frontendOutput",
    backend:           "backendOutput",
    database:          "databaseOutput",
    ai_integration:    "aiIntegrationOutput",
    github_agent:      "githubOutput",
    cloudflare_deploy: "cloudflareOutput",
    export_agent:      "exportOutput",
    qa:                "qaReport",
    repair:            "repairOutput",
  };
  return map[agent] ?? null;
}

async function dispatchToAgent(task: Task, ctx: AgentContext): Promise<AgentResult> {
  const { runProductManager } = await import("./product-manager");
  const { runArchitect }      = await import("./architect");
  const { runQA }             = await import("./qa");
  const { runRepair }         = await import("./repair");
  const { runUIUX }           = await import("./uiux");
  const { runFrontend }       = await import("./frontend");
  const { runBackend }        = await import("./backend");
  const { runDatabase }       = await import("./database");
  const { runAIIntegration }  = await import("./ai_integration");
  const { runGitHubAgent }    = await import("./github_agent");
  const { runCloudfareDeploy } = await import("./cloudflare_deploy");
  const { runExportAgent }    = await import("./export_agent");

  const agentMap: Record<string, (ctx: AgentContext) => Promise<AgentResult>> = {
    product_manager:   runProductManager,
    architect:         runArchitect,
    qa:                runQA,
    repair:            runRepair,
    uiux:              runUIUX,
    frontend:          runFrontend,
    backend:           runBackend,
    database:          runDatabase,
    ai_integration:    runAIIntegration,
    github_agent:      runGitHubAgent,
    cloudflare_deploy: runCloudfareDeploy,
    export_agent:      runExportAgent,
  };

  const handler = agentMap[task.assigned_agent];
  if (!handler) throw new Error(`Unknown agent: ${task.assigned_agent}`);
  return handler(ctx);
}
