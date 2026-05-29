import type { AIProvider, AIResponse, GenerateTextOptions, GenerateStructuredOptions, StreamTextOptions, ModelInfo, HealthCheckResult, StructuredResponse } from "../types";
import { ProviderError } from "../types";
const DEFAULT_MODELS = ["meta-llama/Llama-3.1-8B-Instruct","microsoft/Phi-3.5-mini-instruct","Qwen/Qwen2.5-7B-Instruct"];
function getToken() { const t = process.env.HUGGINGFACE_TOKEN; if (!t) throw new ProviderError("huggingface", "auth", "HUGGINGFACE_TOKEN is not set"); return t; }
function resolveModel(m: string) { return m === "dynamic" ? DEFAULT_MODELS[0] : m; }
export const HuggingFaceProvider: AIProvider = {
  name: "huggingface",
  async generateText(opts: GenerateTextOptions): Promise<AIResponse> {
    const start = Date.now(); const model = resolveModel(opts.model);
    const res = await fetch(`https://api-inference.huggingface.co/models/${model}/v1/chat/completions`, { method: "POST", headers: { "Authorization": `Bearer ${getToken()}`, "Content-Type": "application/json" }, body: JSON.stringify({ model, messages: opts.messages, temperature: opts.temperature ?? 0.2, max_tokens: opts.maxTokens ?? 2048 }) });
    if (res.status === 401) throw new ProviderError("huggingface", "auth", "Invalid HuggingFace token"); if (res.status === 429) throw new ProviderError("huggingface", "rate_limit", "HF rate limit"); if (!res.ok) throw new ProviderError("huggingface", "unknown", `HTTP ${res.status}`);
    const data = await res.json(); return { content: data.choices[0].message.content, provider: "huggingface", model, usage: data.usage ?? { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }, latency_ms: Date.now() - start };
  },
  async generateStructured<T>(opts: GenerateStructuredOptions<T>): Promise<StructuredResponse<T>> {
    const withJson = { ...opts, messages: [...opts.messages, { role: "system" as const, content: "Respond with valid JSON only. No markdown, no explanation." }] };
    const response = await this.generateText(withJson);
    try { const match = response.content.match(/\{[\s\S]*\}/); const raw = match ? JSON.parse(match[0]) : JSON.parse(response.content); return { ...response, data: opts.schema.parse(raw) }; }
    catch (err) { throw new ProviderError("huggingface", "unknown", `Schema validation failed: ${err}`); }
  },
  async streamText(opts: StreamTextOptions): Promise<AIResponse> {
    const start = Date.now(); const model = resolveModel(opts.model); let fullContent = ""; const usage = { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
    const res = await fetch(`https://api-inference.huggingface.co/models/${model}/v1/chat/completions`, { method: "POST", headers: { "Authorization": `Bearer ${getToken()}`, "Content-Type": "application/json" }, body: JSON.stringify({ model, messages: opts.messages, temperature: opts.temperature ?? 0.2, stream: true }) });
    if (!res.ok || !res.body) throw new ProviderError("huggingface", "unknown", "Stream failed");
    const reader = res.body.getReader(); const decoder = new TextDecoder();
    while (true) { const { done, value } = await reader.read(); if (done) break; for (const line of decoder.decode(value).split("\n").filter(l => l.startsWith("data: "))) { const json = line.slice(6); if (json === "[DONE]") continue; try { const chunk = JSON.parse(json); const delta = chunk.choices?.[0]?.delta?.content ?? ""; if (delta) { fullContent += delta; opts.onChunk(delta); } } catch { /* skip */ } } }
    return { content: fullContent, provider: "huggingface", model, usage, latency_ms: Date.now() - start };
  },
  async listModels(): Promise<ModelInfo[]> { return DEFAULT_MODELS.map(id => ({ id, name: id, provider: "huggingface", context_length: 8192, supports_json: false, supports_stream: true })); },
  async healthCheck(): Promise<HealthCheckResult> { const start = Date.now(); try { await this.generateText({ model: DEFAULT_MODELS[0], messages: [{ role: "user", content: "ping" }], maxTokens: 5, timeout: 8000 }); return { provider: "huggingface", status: "ok", latency_ms: Date.now() - start, checked_at: new Date().toISOString() }; } catch (err) { return { provider: "huggingface", status: "down", latency_ms: Date.now() - start, error: String(err), checked_at: new Date().toISOString() }; } },
};
