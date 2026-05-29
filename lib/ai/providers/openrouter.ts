import type { AIProvider, AIResponse, GenerateTextOptions, GenerateStructuredOptions, StreamTextOptions, ModelInfo, HealthCheckResult, StructuredResponse } from "../types";
import { ProviderError } from "../types";
const BASE_URL = "https://openrouter.ai/api/v1";
const FREE_MODELS = ["deepseek/deepseek-chat:free","qwen/qwen3-235b-a22b:free","meta-llama/llama-4-scout:free","mistralai/mistral-7b-instruct:free"];
function getToken() { const t = process.env.OPENROUTER_API_KEY; if (!t) throw new ProviderError("openrouter", "auth", "OPENROUTER_API_KEY is not set"); return t; }
const HEADERS = () => ({ "Authorization": `Bearer ${getToken()}`, "Content-Type": "application/json", "HTTP-Referer": "https://agentforge.app", "X-Title": "AgentForge" });
function resolveModel(m: string) { return m === "dynamic" ? FREE_MODELS[0] : m; }
export const OpenRouterProvider: AIProvider = {
  name: "openrouter",
  async generateText(opts: GenerateTextOptions): Promise<AIResponse> {
    const start = Date.now(); const model = resolveModel(opts.model);
    const res = await fetch(`${BASE_URL}/chat/completions`, { method: "POST", headers: HEADERS(), body: JSON.stringify({ model, messages: opts.messages, temperature: opts.temperature ?? 0.2, max_tokens: opts.maxTokens ?? 4096 }) });
    if (res.status === 401) throw new ProviderError("openrouter", "auth", "Invalid OpenRouter key"); if (res.status === 429) throw new ProviderError("openrouter", "rate_limit", "Rate limit"); if (!res.ok) throw new ProviderError("openrouter", "unknown", `HTTP ${res.status}`);
    const data = await res.json(); return { content: data.choices[0].message.content, provider: "openrouter", model, usage: data.usage, latency_ms: Date.now() - start };
  },
  async generateStructured<T>(opts: GenerateStructuredOptions<T>): Promise<StructuredResponse<T>> {
    const start = Date.now(); const model = resolveModel(opts.model);
    const res = await fetch(`${BASE_URL}/chat/completions`, { method: "POST", headers: HEADERS(), body: JSON.stringify({ model, messages: opts.messages, temperature: opts.temperature ?? 0.2, max_tokens: opts.maxTokens ?? 4096, response_format: { type: "json_object" } }) });
    if (!res.ok) throw new ProviderError("openrouter", "unknown", `HTTP ${res.status}`);
    const raw = await res.json(); const data = opts.schema.parse(JSON.parse(raw.choices[0].message.content));
    return { content: raw.choices[0].message.content, data, provider: "openrouter", model, usage: raw.usage, latency_ms: Date.now() - start };
  },
  async streamText(opts: StreamTextOptions): Promise<AIResponse> {
    const start = Date.now(); const model = resolveModel(opts.model); let fullContent = ""; let usage = { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
    const res = await fetch(`${BASE_URL}/chat/completions`, { method: "POST", headers: HEADERS(), body: JSON.stringify({ model, messages: opts.messages, temperature: opts.temperature ?? 0.2, stream: true }) });
    if (!res.ok || !res.body) throw new ProviderError("openrouter", "unknown", "Stream failed");
    const reader = res.body.getReader(); const decoder = new TextDecoder();
    while (true) { const { done, value } = await reader.read(); if (done) break; for (const line of decoder.decode(value).split("\n").filter(l => l.startsWith("data: "))) { const json = line.slice(6); if (json === "[DONE]") continue; try { const chunk = JSON.parse(json); const delta = chunk.choices?.[0]?.delta?.content ?? ""; if (delta) { fullContent += delta; opts.onChunk(delta); } if (chunk.usage) usage = chunk.usage; } catch { /* skip */ } } }
    return { content: fullContent, provider: "openrouter", model, usage, latency_ms: Date.now() - start };
  },
  async listModels(): Promise<ModelInfo[]> { try { const res = await fetch(`${BASE_URL}/models`, { headers: HEADERS() }); if (!res.ok) return []; const data = await res.json(); return (data.data ?? []).map((m: Record<string, unknown>) => ({ id: String(m.id), name: String((m as Record<string,unknown>).name ?? m.id), provider: "openrouter", context_length: Number(m.context_length ?? 8192), supports_json: true, supports_stream: true, cost_per_1k_tokens: Number((m.pricing as Record<string,unknown>)?.completion ?? 0) })); } catch { return []; } },
  async healthCheck(): Promise<HealthCheckResult> { const start = Date.now(); try { const res = await fetch(`${BASE_URL}/models`, { headers: HEADERS() }); return { provider: "openrouter", status: res.ok ? "ok" : "degraded", latency_ms: Date.now() - start, checked_at: new Date().toISOString() }; } catch (err) { return { provider: "openrouter", status: "down", latency_ms: Date.now() - start, error: String(err), checked_at: new Date().toISOString() }; } },
};
