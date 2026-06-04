import { GitHubModelsProvider } from "./providers/github-models";
import { GroqProvider }         from "./providers/groq";
import { MistralProvider }      from "./providers/mistral";
import { OpenRouterProvider }   from "./providers/openrouter";
import { HuggingFaceProvider }  from "./providers/huggingface";
import { taskModelMatrix, type TaskType } from "./task-model-matrix";
import type { AIProvider, StructuredResponse, AIResponse, HealthCheckResult } from "./types";
import { z } from "zod";

const PROVIDERS: Record<string, AIProvider> = {
  githubModels: GitHubModelsProvider,
  groq:         GroqProvider,
  mistral:      MistralProvider,
  openrouter:   OpenRouterProvider,
  huggingface:  HuggingFaceProvider,
};

export const ROUTING_PROFILES = {
  free_tier:  ["githubModels", "openrouter", "groq", "huggingface", "mistral"],
  balanced:   ["openrouter", "githubModels", "groq", "mistral", "huggingface"],
  fast_build: ["groq", "githubModels", "openrouter", "mistral", "huggingface"],
  quality:    ["mistral", "githubModels", "openrouter", "groq", "huggingface"],
} as const;
export type RoutingProfile = keyof typeof ROUTING_PROFILES;

export interface RouterCtx {
  projectId: string; runId: string; userId: string; taskId: string;
  providerConfig: {
    routingProfile: RoutingProfile;
    freeTierFirst: boolean;
    fastRepair: boolean;
    qualityMode: boolean;
    modelOverrides?: Partial<Record<TaskType, { provider: string; model: string }>>;
  };
}

export interface RouterOptions {
  taskType: TaskType;
  systemPrompt: string;
  userMessage: string;
  ctx: RouterCtx;
  temperature?: number;
  maxTokens?: number;
}

async function logCall(data: { taskType: string; ctx: RouterCtx; provider: string; model: string; result: AIResponse | null; error: Error | null }) {
  try {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const sb = createAdminClient();
    await sb.from("audit_logs").insert({ user_id: data.ctx.userId, project_id: data.ctx.projectId, run_id: data.ctx.runId, task_id: data.ctx.taskId, actor: `agent:${data.taskType}`, action: data.error ? "provider.call.failed" : "provider.call.success", resource: "ai_provider", resource_id: data.provider, metadata: { provider: data.provider, model: data.model, task_type: data.taskType, tokens_used: data.result?.usage?.total_tokens ?? 0, latency_ms: data.result?.latency_ms ?? 0, error: data.error?.message ?? null } });
  } catch { /* non-blocking */ }
}

export async function generateText(opts: RouterOptions): Promise<AIResponse & { provider: string; model: string }> {
  const routing  = taskModelMatrix[opts.taskType];
  const override = opts.ctx.providerConfig.modelOverrides?.[opts.taskType];
  const chain    = override ? [override, ...routing.fallback] : [routing.primary, ...routing.fallback];
  const messages = [{ role: "system" as const, content: opts.systemPrompt }, { role: "user" as const, content: opts.userMessage }];
  let lastError: Error | null = null;
  for (const { provider, model } of chain) {
    try {
      const p = PROVIDERS[provider]; if (!p) continue;
      const result = await p.generateText({ messages, model, temperature: opts.temperature, maxTokens: opts.maxTokens });
      await logCall({ ...opts, provider, model, result, error: null });
      return { ...result, provider, model };
    } catch (err) { lastError = err as Error; await logCall({ ...opts, provider, model, result: null, error: lastError }); }
  }
  throw new Error(`All providers failed for ${opts.taskType}. Last: ${lastError?.message}`);
}

export async function generateStructured<T>(opts: RouterOptions & { schema: z.ZodSchema<T> }): Promise<StructuredResponse<T> & { provider: string; model: string }> {
  const routing  = taskModelMatrix[opts.taskType];
  const override = opts.ctx.providerConfig.modelOverrides?.[opts.taskType];
  const chain    = override ? [override, ...routing.fallback] : [routing.primary, ...routing.fallback];
  const messages = [{ role: "system" as const, content: opts.systemPrompt }, { role: "user" as const, content: opts.userMessage }];
  let lastError: Error | null = null;
  for (const { provider, model } of chain) {
    try {
      const p = PROVIDERS[provider]; if (!p) continue;
      const result = await p.generateStructured({ messages, model, schema: opts.schema, temperature: opts.temperature, maxTokens: opts.maxTokens });
      await logCall({ ...opts, provider, model, result, error: null });
      return { ...result, provider, model };
    } catch (err) {
      // BUG-002 FIX: ZodError means the model returned a structurally wrong response.
      // Retrying other providers won't help — they all use the same prompt and schema.
      // Surface the schema error immediately with a clear message instead of exhausting
      // the fallback chain and masking the root cause behind "OPENROUTER_API_KEY is not set".
      if (err instanceof z.ZodError) {
        const issues = (err as z.ZodError).issues
          .slice(0, 5)
          .map(i => `  • ${i.path.join(".")}: ${i.message}`)
          .join("\n");
        throw new Error(
          `Schema validation failed for ${opts.taskType} (provider: ${provider}, model: ${model}).\n` +
          `The model returned a response that does not match the expected schema.\n` +
          `First issues:\n${issues}\n` +
          `Fix: update the system prompt to produce output matching the Zod schema exactly.`
        );
      }
      lastError = err as Error;
      await logCall({ ...opts, provider, model, result: null, error: lastError });
    }
  }
  throw new Error(`All providers failed for structured (${opts.taskType}). Last: ${lastError?.message}`);
}

export async function healthCheckAll(): Promise<HealthCheckResult[]> {
  return Promise.all(Object.values(PROVIDERS).map(p => p.healthCheck()));
}
