import { generateStructured } from "@/lib/ai/provider-router";
import { type AgentContext, type AgentResult } from "@/types/agent";
import { z } from "zod";

const ArchitectureSchema = z.object({
  app_type:     z.enum(["spa","ssr","static","worker","hybrid"]),
  tech_stack:   z.object({ frontend: z.string(), backend: z.string(), database: z.string(), auth: z.string(), storage: z.string(), deployment: z.string() }),
  folder_structure: z.array(z.object({ path: z.string(), purpose: z.string() })),
  domain_model: z.array(z.object({ entity: z.string(), fields: z.array(z.string()), relations: z.array(z.string()) })),
  api_plan:     z.array(z.object({ method: z.string(), path: z.string(), description: z.string(), auth: z.boolean() })),
  deployment_strategy: z.object({ target: z.string(), ci_cd: z.string(), env_vars: z.array(z.string()) }),
  notes:        z.string().optional(),
});
export type Architecture = z.infer<typeof ArchitectureSchema>;

const SYSTEM = `You are the Architect Agent for AgentForge. Given a product brief, produce a complete technical architecture: app type, tech stack (default: Next.js 15 + TypeScript + Tailwind + Supabase), folder structure, domain model, API plan, and deployment strategy. Return ONLY valid JSON matching the Architecture schema.`;

export async function runArchitect(ctx: AgentContext): Promise<AgentResult<Architecture>> {
  const start = Date.now();
  const brief = JSON.stringify(ctx.inputs.productBrief ?? ctx.inputs.plan ?? {});
  const result = await generateStructured({ taskType: "architect", systemPrompt: SYSTEM, userMessage: `Create architecture for: ${brief}`, schema: ArchitectureSchema, ctx });
  return { success: true, output: result.data, errors: [], metadata: { provider: result.provider, model: result.model, tokens_used: result.usage.total_tokens, latency_ms: Date.now() - start, provenance: { agent: "architect", model: result.model, provider: result.provider, run_id: ctx.runId, task_id: ctx.taskId, generated_at: new Date().toISOString(), version: 1 } } };
}
