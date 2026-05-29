export type TaskType =
  | "orchestrator" | "productManager" | "architect" | "uiux"
  | "frontendCode" | "backendCode" | "database" | "qa"
  | "repair" | "docs" | "githubOps" | "cloudflareOps" | "exportAgent";

export interface ModelRef { provider: string; model: string; }
export interface TaskRouting { primary: ModelRef; fallback: ModelRef[]; }

export const taskModelMatrix: Record<TaskType, TaskRouting> = {
  orchestrator:  { primary: { provider: "githubModels", model: "gpt-4.1-mini" },      fallback: [{ provider: "githubModels", model: "deepseek-v3" }, { provider: "openrouter", model: "dynamic" }] },
  productManager:{ primary: { provider: "githubModels", model: "gpt-4.1-mini" },      fallback: [{ provider: "githubModels", model: "phi-4" }, { provider: "huggingface", model: "dynamic" }] },
  architect:     { primary: { provider: "githubModels", model: "deepseek-v3" },        fallback: [{ provider: "mistral", model: "mistral-medium-latest" }, { provider: "openrouter", model: "dynamic" }] },
  uiux:          { primary: { provider: "githubModels", model: "gpt-4.1-mini" },       fallback: [{ provider: "openrouter", model: "dynamic" }] },
  frontendCode:  { primary: { provider: "mistral", model: "codestral-latest" },        fallback: [{ provider: "githubModels", model: "codestral-25.01" }, { provider: "githubModels", model: "llama-3.3-70b-instruct" }, { provider: "openrouter", model: "dynamic" }] },
  backendCode:   { primary: { provider: "mistral", model: "mistral-medium-latest" },   fallback: [{ provider: "mistral", model: "codestral-latest" }, { provider: "githubModels", model: "deepseek-v3" }] },
  database:      { primary: { provider: "githubModels", model: "deepseek-v3" },        fallback: [{ provider: "mistral", model: "mistral-small-latest" }] },
  qa:            { primary: { provider: "groq", model: "llama-3.3-70b-versatile" },    fallback: [{ provider: "groq", model: "qwen/qwen3-32b" }, { provider: "githubModels", model: "llama-3.3-70b-instruct" }] },
  repair:        { primary: { provider: "groq", model: "llama-3.3-70b-versatile" },    fallback: [{ provider: "mistral", model: "codestral-latest" }, { provider: "openrouter", model: "dynamic" }] },
  docs:          { primary: { provider: "githubModels", model: "phi-4" },              fallback: [{ provider: "huggingface", model: "dynamic" }] },
  githubOps:     { primary: { provider: "githubModels", model: "gpt-4.1-mini" },       fallback: [{ provider: "githubModels", model: "phi-4" }] },
  cloudflareOps: { primary: { provider: "githubModels", model: "gpt-4.1-mini" },       fallback: [{ provider: "mistral", model: "mistral-small-latest" }] },
  exportAgent:   { primary: { provider: "githubModels", model: "phi-4" },              fallback: [{ provider: "huggingface", model: "dynamic" }] },
};
