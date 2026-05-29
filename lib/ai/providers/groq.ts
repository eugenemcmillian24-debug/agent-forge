import type { AIProvider, AIResponse, GenerateTextOptions, GenerateStructuredOptions, StreamTextOptions, ModelInfo, HealthCheckResult, StructuredResponse } from "../types";
import { ProviderError } from "../types";

const BASE_URL = "https://api.groq.com/openai/v1";
function getToken() { const t = process.env.GROQ_API_KEY; if (!t) throw new ProviderError("groq", "auth", "GROQ_API_KEY is not set"); return t; }

async function callGroq(model: string, messages: Array<{ role: string; content: string }>, opts: { temperature?: number; maxTokens?: number; jsonMode?: boolean }, timeout = 30_000) {
  const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(`${BASE_URL}/chat/completions`, { method: "POST", headers: { "Authorization": `Bearer ${getToken()}`, "Content-Type": "application/json" }, body: JSON.stringify({ model, messages, temperature: opts.temperature ?? 0.1, max_tokens: opts.maxTokens ?? 4096, response_format: opts.jsonMode ? { type: "json_object" } : undefined }), signal: controller.signal });
    if (res.status === 401) throw new ProviderError("groq", "auth", "Invalid Groq API key");
    if (res.status === 429) throw new ProviderError("groq", "rate_limit", "Groq rate limit exceeded");
    if (!res.ok) throw new ProviderError("groq", "unknown", `HTTP ${res.status}`);
    const data = await res.json(); return { content: data.choices[0].message.content as string, usage: data.usage as { prompt_tokens: number; completion_tokens: number; total_tokens: number } };
  } catch (err) { if ((err as Error).name === "AbortError") throw new ProviderError("groq", "timeout", `Timeout after ${timeout}ms`); throw err; }
  finally { clearTimeout(timer); }
}

export const GroqProvider: AIProvider = {
  name: "groq",
  async generateText(opts: GenerateTextOptions): Promise<AIResponse> { const start = Date.now(); const r = await callGroq(opts.model, opts.messages, { temperature: opts.temperature, maxTokens: opts.maxTokens }, opts.timeout); return { content: r.content, provider: "groq", model: opts.model, usage: r.usage, latency_ms: Date.now() - start }; },
  async generateStructured<T>(opts: GenerateStructuredOptions<T>): Promise<StructuredResponse<T>> { const start = Date.now(); const r = await callGroq(opts.model, opts.messages, { temperature: opts.temperature, maxTokens: opts.maxTokens, jsonMode: true }, opts.timeout); const data = opts.schema.parse(JSON.parse(r.content)); return { content: r.content, data, provider: "groq", model: opts.model, usage: r.usage, latency_ms: Date.now() - start }; },
  async streamText(opts: StreamTextOptions): Promise<AIResponse> {
    const start = Date.now(); let fullContent = ""; let usage = { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
    const res = await fetch(`${BASE_URL}/chat/completions`, { method: "POST", headers: { "Authorization": `Bearer ${getToken()}`, "Content-Type": "application/json" }, body: JSON.stringify({ model: opts.model, messages: opts.messages, temperature: opts.temperature ?? 0.1, stream: true }) });
    if (!res.ok || !res.body) throw new ProviderError("groq", "unknown", "Stream failed");
    const reader = res.body.getReader(); const decoder = new TextDecoder();
    while (true) { const { done, value } = await reader.read(); if (done) break; for (const line of decoder.decode(value).split("\n").filter(l => l.startsWith("data: "))) { const json = line.slice(6); if (json === "[DONE]") continue; try { const chunk = JSON.parse(json); const delta = chunk.choices?.[0]?.delta?.content ?? ""; if (delta) { fullContent += delta; opts.onChunk(delta); } if (chunk.usage) usage = chunk.usage; } catch { /* skip */ } } }
    return { content: fullContent, provider: "groq", model: opts.model, usage, latency_ms: Date.now() - start };
  },
  async listModels(): Promise<ModelInfo[]> { try { const res = await fetch(`${BASE_URL}/models`, { headers: { "Authorization": `Bearer ${getToken()}` } }); if (!res.ok) return []; const data = await res.json(); return (data.data ?? []).map((m: Record<string, unknown>) => ({ id: String(m.id), name: String(m.id), provider: "groq", context_length: Number(m.context_window ?? 32768), supports_json: true, supports_stream: true })); } catch { return []; } },
  async healthCheck(): Promise<HealthCheckResult> { const start = Date.now(); try { await callGroq("llama-3.3-70b-versatile", [{ role: "user", content: "ping" }], { maxTokens: 5 }, 8000); return { provider: "groq", status: "ok", latency_ms: Date.now() - start, checked_at: new Date().toISOString() }; } catch (err) { return { provider: "groq", status: "down", latency_ms: Date.now() - start, error: String(err), checked_at: new Date().toISOString() }; } },
};
