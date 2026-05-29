import { generateStructured } from "@/lib/ai/provider-router";
import { type AgentContext, type AgentResult } from "@/types/agent";
import { z } from "zod";

const ProductBriefSchema = z.object({
  app_name:      z.string(),
  tagline:       z.string(),
  target_users:  z.array(z.string()),
  core_features: z.array(z.object({ id: z.string(), title: z.string(), description: z.string(), priority: z.enum(["must","should","could"]), acceptance: z.array(z.string()) })),
  user_flows:    z.array(z.object({ name: z.string(), steps: z.array(z.string()) })),
  milestones:    z.array(z.object({ phase: z.string(), deliverable: z.string() })),
  out_of_scope:  z.array(z.string()),
});
export type ProductBrief = z.infer<typeof ProductBriefSchema>;

const SYSTEM = `You are the Product Manager Agent for AgentForge. Given an app idea, produce a structured product brief with: app name, tagline, target users, core features with MoSCoW priority and acceptance criteria, user flows, milestones, and out-of-scope items. Be specific. Return ONLY valid JSON matching the ProductBrief schema.`;

export async function runProductManager(ctx: AgentContext): Promise<AgentResult<ProductBrief>> {
  const start = Date.now();
  const prompt = String(ctx.inputs.userPrompt ?? ctx.inputs.plan ?? "Build a modern web app");
  const result = await generateStructured({ taskType: "productManager", systemPrompt: SYSTEM, userMessage: `Create a product brief for: ${prompt}`, schema: ProductBriefSchema, ctx });
  return { success: true, output: result.data, errors: [], metadata: { provider: result.provider, model: result.model, tokens_used: result.usage.total_tokens, latency_ms: Date.now() - start, provenance: { agent: "product_manager", model: result.model, provider: result.provider, run_id: ctx.runId, task_id: ctx.taskId, generated_at: new Date().toISOString(), version: 1 } } };
}
