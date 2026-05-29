import { generateStructured } from "@/lib/ai/provider-router";
import { type AgentContext, type AgentResult } from "@/types/agent";
import { z } from "zod";

const QAReportSchema = z.object({
  passed:        z.boolean(),
  checks:        z.array(z.object({ name: z.string(), status: z.enum(["pass","fail","warning","skip"]), message: z.string().optional(), file: z.string().optional(), line: z.number().optional() })),
  errors:        z.array(z.string()),
  warnings:      z.array(z.string()),
  repair_needed: z.boolean(),
  repair_tasks:  z.array(z.object({ file: z.string(), issue: z.string(), context: z.string() })),
});
export type QAReport = z.infer<typeof QAReportSchema>;

const SYSTEM = `You are the QA Agent for AgentForge. Review the generated codebase and check: TypeScript types, imports, Next.js App Router conventions, env vars in .env.example, Zod validation on API inputs, auth checks, RLS policies, and deployment config. Report pass/fail with file/line details. Set repair_needed=true if any check fails. Return ONLY valid JSON matching the QAReport schema.`;

export async function runQA(ctx: AgentContext): Promise<AgentResult<QAReport>> {
  const start = Date.now();
  const files = JSON.stringify(ctx.inputs.files ?? []);
  const result = await generateStructured({ taskType: "qa", systemPrompt: SYSTEM, userMessage: `Review these generated files: ${files.slice(0, 8000)}`, schema: QAReportSchema, ctx });
  return { success: true, output: result.data, errors: [], metadata: { provider: result.provider, model: result.model, tokens_used: result.usage.total_tokens, latency_ms: Date.now() - start, provenance: { agent: "qa", model: result.model, provider: result.provider, run_id: ctx.runId, task_id: ctx.taskId, generated_at: new Date().toISOString(), version: 1 } } };
}
