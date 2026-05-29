export const providerRegistry = {
  githubModels: {
    enabled: true,
    envKey: "GITHUB_MODELS_TOKEN",
    type: "catalog+inference" as const,
    baseUrl: "https://models.inference.ai.azure.com",
    catalogUrl: "https://models.github.ai/catalog/models",
    defaultModels: {
      orchestrator: "gpt-4.1-mini",
      productManager: "gpt-4.1-mini",
      architect: "deepseek-v3",
      uiux: "gpt-4.1-mini",
      docs: "phi-4",
      githubOps: "gpt-4.1-mini",
      cloudflareOps: "gpt-4.1-mini",
      exportAgent: "phi-4",
      fallbackGeneral: "llama-3.3-70b-instruct",
      fallbackCode: "codestral-25.01",
    },
  },
  mistral: {
    enabled: true,
    envKey: "MISTRAL_API_KEY",
    type: "direct" as const,
    baseUrl: "https://api.mistral.ai/v1",
    defaultModels: {
      frontendCode: "codestral-latest",
      backendCode: "mistral-medium-latest",
      complexReasoning: "mistral-large-latest",
      cheapUtility: "mistral-small-latest",
    },
  },
  groq: {
    enabled: true,
    envKey: "GROQ_API_KEY",
    type: "direct" as const,
    baseUrl: "https://api.groq.com/openai/v1",
    defaultModels: {
      repair: "llama-3.3-70b-versatile",
      qaFast: "qwen/qwen3-32b",
      reasoningFast: "openai/gpt-oss-120b",
    },
  },
  openrouter: {
    enabled: true,
    envKey: "OPENROUTER_API_KEY",
    type: "dynamic" as const,
    baseUrl: "https://openrouter.ai/api/v1",
    defaultModels: {
      overflowGeneral: "dynamic",
      overflowLongContext: "dynamic",
      overflowCode: "dynamic",
    },
  },
  huggingface: {
    enabled: true,
    envKey: "HUGGINGFACE_TOKEN",
    type: "dynamic" as const,
    baseUrl: "https://api-inference.huggingface.co",
    defaultModels: {
      backupGeneral: "dynamic",
      backupSummary: "dynamic",
      backupClassification: "dynamic",
    },
  },
} as const;

export type ProviderName = keyof typeof providerRegistry;
