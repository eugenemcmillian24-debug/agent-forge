import { generateStructured } from "@/lib/ai/provider-router";
import { type AgentContext, type AgentResult } from "@/types/agent";
import { z } from "zod";

const RepairOutputSchema = z.object({
  fixed_files: z.array(z.object({ path: z.string(), content: z.string(), changes: z.array(z.string()) })),
  unresolved:  z.array(z.object({ file: z.string(), issue: z.string(), reason: z.string() })),
  notes:       z.string().optional(),
});
export type RepairOutput = z.infer<typeof RepairOutputSchema>;

const SYSTEM = `You are the Repair Agent for AgentForge. You receive files with errors and specific error messages. Fix errors with minimal changes. Preserve any // USER_EDIT comments. Do not refactor — only fix what is broken. If an import is missing, add it or create the missing file. Never use 'any' to shortcut type errors. If you cannot fix an error, report it in unresolved with a clear reason. Return ONLY valid JSON matching the RepairOutput schema.`;

export async function runRepair(ctx: AgentContext): Promise<AgentResult<RepairOutput>> {
  const start = Date.now();
  const repairTasks = JSON.stringify(ctx.inputs.repairTasks ?? []);
  const files       = JSON.stringify(ctx.inputs.files ?? []);
  const result = await generateStructured({
    taskType: "repair",
    systemPrompt: SYSTEM,
    userMessage: `Fix these issues:\n${repairTasks}\n\nFiles:\n${files.slice(0, 8000)}`,
    schema: RepairOutputSchema,
    ctx,
  });
  return { success: true, output: result.data, errors: [], metadata: { provider: result.provider, model: result.model, tokens_used: result.usage.total_tokens, latency_ms: Date.now() - start, provenance: { agent: "repair", model: result.model, provider: result.provider, run_id: ctx.runId, task_id: ctx.taskId, generated_at: new Date().toISOString(), version: 1 } } };
}
