import type { AIProvider, AIResponse, GenerateTextOptions, GenerateStructuredOptions, StreamTextOptions, ModelInfo, HealthCheckResult, StructuredResponse } from "../types";
import { ProviderError } from "../types";

const BASE_URL = "https://models.inference.ai.azure.com";
const CATALOG_URL = "https://models.github.ai/catalog/models";

function getToken(): string {
  const token = process.env.GITHUB_MODELS_TOKEN ?? process.env.GITHUB_TOKEN;
  if (!token) throw new ProviderError("githubModels", "auth", "GITHUB_MODELS_TOKEN is not set");
  return token;
}

async function callCompletions(model: string, messages: Array<{ role: string; content: string }>, opts: { temperature?: number; maxTokens?: number; jsonMode?: boolean }, timeout = 30_000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(`${BASE_URL}/chat/completions`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${getToken()}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model, messages, temperature: opts.temperature ?? 0.2, max_tokens: opts.maxTokens ?? 4096, response_format: opts.jsonMode ? { type: "json_object" } : undefined }),
      signal: controller.signal,
    });
    if (res.status === 401) throw new ProviderError("githubModels", "auth", "Invalid GitHub Models token");
    if (res.status === 429) throw new ProviderError("githubModels", "rate_limit", "GitHub Models rate limit exceeded");
    if (!res.ok) throw new ProviderError("githubModels", "unknown", `HTTP ${res.status}: ${await res.text()}`);
    const data = await res.json();
    return { content: data.choices[0].message.content as string, usage: data.usage as { prompt_tokens: number; completion_tokens: number; total_tokens: number } };
  } catch (err) {
    if ((err as Error).name === "AbortError") throw new ProviderError("githubModels", "timeout", `Request timed out after ${timeout}ms`);
    throw err;
  } finally { clearTimeout(timer); }
}

export const GitHubModelsProvider: AIProvider = {
  name: "githubModels",
  async generateText(opts: GenerateTextOptions): Promise<AIResponse> {
    const start = Date.now();
    const result = await callCompletions(opts.model, opts.messages, { temperature: opts.temperature, maxTokens: opts.maxTokens }, opts.timeout);
    return { content: result.content, provider: "githubModels", model: opts.model, usage: result.usage, latency_ms: Date.now() - start };
  },
  async generateStructured<T>(opts: GenerateStructuredOptions<T>): Promise<StructuredResponse<T>> {
    const start = Date.now();
    const result = await callCompletions(opts.model, opts.messages, { temperature: opts.temperature, maxTokens: opts.maxTokens, jsonMode: true }, opts.timeout);
    const parsed = opts.schema.parse(JSON.parse(result.content));
    return { content: result.content, data: parsed, provider: "githubModels", model: opts.model, usage: result.usage, latency_ms: Date.now() - start };
  },
  async streamText(opts: StreamTextOptions): Promise<AIResponse> {
    const start = Date.now(); let fullContent = ""; let usage = { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
    const res = await fetch(`${BASE_URL}/chat/completions`, { method: "POST", headers: { "Authorization": `Bearer ${getToken()}`, "Content-Type": "application/json" }, body: JSON.stringify({ model: opts.model, messages: opts.messages, temperature: opts.temperature ?? 0.2, max_tokens: opts.maxTokens ?? 4096, stream: true }) });
    if (!res.ok || !res.body) throw new ProviderError("githubModels", "unknown", `Stream failed: ${res.status}`);
    const reader = res.body.getReader(); const decoder = new TextDecoder();
    while (true) { const { done, value } = await reader.read(); if (done) break; for (const line of decoder.decode(value).split("\n").filter(l => l.startsWith("data: "))) { const json = line.slice(6); if (json === "[DONE]") continue; try { const chunk = JSON.parse(json); const delta = chunk.choices?.[0]?.delta?.content ?? ""; if (delta) { fullContent += delta; opts.onChunk(delta); } if (chunk.usage) usage = chunk.usage; } catch { /* skip */ } } }
    return { content: fullContent, provider: "githubModels", model: opts.model, usage, latency_ms: Date.now() - start };
  },
  async listModels(): Promise<ModelInfo[]> {
    try { const res = await fetch(CATALOG_URL, { headers: { "Authorization": `Bearer ${getToken()}` } }); if (!res.ok) return []; const data = await res.json(); return (data.models ?? []).map((m: Record<string, unknown>) => ({ id: String(m.id ?? m.name), name: String(m.friendly_name ?? m.name), provider: "githubModels", context_length: Number(m.context_window ?? 8192), supports_json: true, supports_stream: true })); } catch { return []; }
  },
  async healthCheck(): Promise<HealthCheckResult> {
    const start = Date.now();
    try { await callCompletions("gpt-4.1-mini", [{ role: "user", content: "ping" }], { maxTokens: 5 }, 8000); return { provider: "githubModels", status: "ok", latency_ms: Date.now() - start, checked_at: new Date().toISOString() }; }
    catch (err) { return { provider: "githubModels", status: "down", latency_ms: Date.now() - start, error: String(err), checked_at: new Date().toISOString() }; }
  },
};
