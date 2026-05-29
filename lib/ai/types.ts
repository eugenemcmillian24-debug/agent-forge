import { z } from "zod";

export interface Message {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
}

export interface GenerateTextOptions {
  messages: Message[];
  model: string;
  temperature?: number;
  maxTokens?: number;
  timeout?: number;
}

export interface GenerateStructuredOptions<T> extends GenerateTextOptions {
  schema: z.ZodSchema<T>;
  schemaName?: string;
}

export interface StreamTextOptions extends GenerateTextOptions {
  onChunk: (chunk: string) => void;
}

export interface AIResponse {
  content: string;
  provider: string;
  model: string;
  usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
  latency_ms: number;
}

export interface StructuredResponse<T> extends AIResponse {
  data: T;
}

export interface ModelInfo {
  id: string;
  name: string;
  provider: string;
  context_length: number;
  supports_json: boolean;
  supports_stream: boolean;
  cost_per_1k_tokens?: number;
}

export interface HealthCheckResult {
  provider: string;
  status: "ok" | "degraded" | "down";
  latency_ms: number;
  error?: string;
  checked_at: string;
}

export interface AIProvider {
  name: string;
  generateText(opts: GenerateTextOptions): Promise<AIResponse>;
  generateStructured<T>(opts: GenerateStructuredOptions<T>): Promise<StructuredResponse<T>>;
  streamText(opts: StreamTextOptions): Promise<AIResponse>;
  listModels(): Promise<ModelInfo[]>;
  healthCheck(): Promise<HealthCheckResult>;
}

export class ProviderError extends Error {
  constructor(
    public provider: string,
    public code: "auth" | "rate_limit" | "timeout" | "model_not_found" | "unknown",
    message: string,
    public originalError?: unknown
  ) {
    super(message);
    this.name = "ProviderError";
  }
}
