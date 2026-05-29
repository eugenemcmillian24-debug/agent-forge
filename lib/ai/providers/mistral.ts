import type { AIProvider, AIResponse, GenerateTextOptions, GenerateStructuredOptions, StreamTextOptions, ModelInfo, HealthCheckResult, StructuredResponse } from "../types";
import { ProviderError } from "../types";
const BASE_URL = "https://api.mistral.ai/v1";
function getToken() { const t = process.env.MISTRAL_API_KEY; if (!t) throw new ProviderError("mistral", "auth", "MISTRAL_API_KEY is not set"); return t; }
async function callMistral(model: string, messages: Array<{ role: string; content: string }>, opts: { temperature?: number; maxTokens?: number; jsonMode?: boolean }, timeout = 30_000) {
  const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(`${BASE_URL}/chat/completions`, { method: "POST", headers: { "Authorization": `Bearer ${getToken()}`, "Content-Type": "application/json" }, body: JSON.stringify({ model, messages, temperature: opts.temperature ?? 0.2, max_tokens: opts.maxTokens ?? 8192, response_format: opts.jsonMode ? { type: "json_object" } : undefined }), signal: controller.signal });
    if (res.status === 401) throw new ProviderError("mistral", "auth", "Invalid Mistral API key");
    if (res.status === 429) throw new ProviderError("mistral", "rate_limit", "Mistral rate limit exceeded");
    if (!res.ok) throw new ProviderError("mistral", "unknown", `HTTP ${res.status}`);
    const data = await res.json(); return { content: data.choices[0].message.content as string, usage: data.usage as { prompt_tokens: number; completion_tokens: number; total_tokens: number } };
  } catch (err) { if ((err as Error).name === "AbortError") throw new ProviderError("mistral", "timeout", `Timeout after ${timeout}ms`); throw err; }
  finally { clearTimeout(timer); }
}
export const MistralProvider: AIProvider = {
  name: "mistral",
  async generateText(opts: GenerateTextOptions): Promise<AIResponse> { const start = Date.now(); const r = await callMistral(opts.model, opts.messages, { temperature: opts.temperature, maxTokens: opts.maxTokens }, opts.timeout); return { content: r.content, provider: "mistral", model: opts.model, usage: r.usage, latency_ms: Date.now() - start }; },
  async generateStructured<T>(opts: GenerateStructuredOptions<T>): Promise<StructuredResponse<T>> { const start = Date.now(); const r = await callMistral(opts.model, opts.messages, { temperature: opts.temperature, maxTokens: opts.maxTokens, jsonMode: true }, opts.timeout); const data = opts.schema.parse(JSON.parse(r.content)); return { content: r.content, data, provider: "mistral", model: opts.model, usage: r.usage, latency_ms: Date.now() - start }; },
  async streamText(opts: StreamTextOptions): Promise<AIResponse> {
    const start = Date.now(); let fullContent = ""; let usage = { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
    const res = await fetch(`${BASE_URL}/chat/completions`, { method: "POST", headers: { "Authorization": `Bearer ${getToken()}`, "Content-Type": "application/json" }, body: JSON.stringify({ model: opts.model, messages: opts.messages, temperature: opts.temperature ?? 0.2, stream: true }) });
    if (!res.ok || !res.body) throw new ProviderError("mistral", "unknown", "Stream failed");
    const reader = res.body.getReader(); const decoder = new TextDecoder();
    while (true) { const { done, value } = await reader.read(); if (done) break; for (const line of decoder.decode(value).split("\n").filter(l => l.startsWith("data: "))) { const json = line.slice(6); if (json === "[DONE]") continue; try { const chunk = JSON.parse(json); const delta = chunk.choices?.[0]?.delta?.content ?? ""; if (delta) { fullContent += delta; opts.onChunk(delta); } if (chunk.usage) usage = chunk.usage; } catch { /* skip */ } } }
    return { content: fullContent, provider: "mistral", model: opts.model, usage, latency_ms: Date.now() - start };
  },
  async listModels(): Promise<ModelInfo[]> { try { const res = await fetch(`${BASE_URL}/models`, { headers: { "Authorization": `Bearer ${getToken()}` } }); if (!res.ok) return []; const data = await res.json(); return (data.data ?? []).map((m: Record<string, unknown>) => ({ id: String(m.id), name: String(m.id), provider: "mistral", context_length: Number(m.max_context_length ?? 32768), supports_json: true, supports_stream: true })); } catch { return []; } },
  async healthCheck(): Promise<HealthCheckResult> { const start = Date.now(); try { await callMistral("mistral-small-latest", [{ role: "user", content: "ping" }], { maxTokens: 5 }, 8000); return { provider: "mistral", status: "ok", latency_ms: Date.now() - start, checked_at: new Date().toISOString() }; } catch (err) { return { provider: "mistral", status: "down", latency_ms: Date.now() - start, error: String(err), checked_at: new Date().toISOString() }; } },
};
