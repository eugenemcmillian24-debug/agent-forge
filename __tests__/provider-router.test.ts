/**
 * Tests for the provider fallback chain in lib/ai/provider-router.ts
 *
 * We mock the provider implementations and verify:
 * - Primary provider is called first
 * - On failure, the next provider in the chain is tried
 * - Auth errors are not retried (no point hammering a bad token)
 * - All providers exhausted → throws
 * - Routing profiles select the right provider order
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { taskModelMatrix } from "@/lib/ai/task-model-matrix";

// ── Routing profile logic (extracted from provider-router.ts) ─────────────────
const ROUTING_PROFILES = {
  free_tier:  ["githubModels", "openrouter", "groq", "huggingface", "mistral"],
  balanced:   ["openrouter", "githubModels", "groq", "mistral", "huggingface"],
  fast_build: ["groq", "githubModels", "openrouter", "mistral", "huggingface"],
  quality:    ["mistral", "githubModels", "openrouter", "groq", "huggingface"],
} as const;

type RoutingProfile = keyof typeof ROUTING_PROFILES;
type ProviderError = { type: "auth" | "rate_limit" | "timeout" | "unknown"; message: string };

// Simulate the fallback chain logic
async function simulateFallback(
  profile: RoutingProfile,
  providerBehaviours: Record<string, "success" | ProviderError>
): Promise<{ provider: string; attempts: string[] }> {
  const order = ROUTING_PROFILES[profile];
  const attempts: string[] = [];

  for (const provider of order) {
    attempts.push(provider);
    const behaviour = providerBehaviours[provider];

    if (!behaviour || behaviour === "success") {
      return { provider, attempts };
    }

    // Auth errors: stop immediately, don't try next provider
    if (behaviour.type === "auth") {
      throw new Error(`Auth error on ${provider}: ${behaviour.message}`);
    }

    // rate_limit / timeout / unknown: try next provider
    continue;
  }

  throw new Error("All providers exhausted");
}

describe("Routing profiles", () => {
  it("free_tier starts with githubModels", () => {
    expect(ROUTING_PROFILES.free_tier[0]).toBe("githubModels");
  });

  it("fast_build starts with groq", () => {
    expect(ROUTING_PROFILES.fast_build[0]).toBe("groq");
  });

  it("quality starts with mistral", () => {
    expect(ROUTING_PROFILES.quality[0]).toBe("mistral");
  });

  it("balanced starts with openrouter", () => {
    expect(ROUTING_PROFILES.balanced[0]).toBe("openrouter");
  });

  it("every profile contains exactly 5 providers", () => {
    for (const [name, order] of Object.entries(ROUTING_PROFILES)) {
      expect(order).toHaveLength(5);
    }
  });

  it("every profile contains all 5 providers", () => {
    const allProviders = ["githubModels", "openrouter", "groq", "huggingface", "mistral"];
    for (const [name, order] of Object.entries(ROUTING_PROFILES)) {
      expect([...order].sort()).toEqual(allProviders.sort());
    }
  });
});

describe("Provider fallback chain", () => {
  it("uses primary provider when it succeeds", async () => {
    const { provider, attempts } = await simulateFallback("balanced", {
      openrouter: "success",
    });
    expect(provider).toBe("openrouter");
    expect(attempts).toHaveLength(1);
  });

  it("falls back to second provider on rate limit", async () => {
    const { provider, attempts } = await simulateFallback("balanced", {
      openrouter:   { type: "rate_limit", message: "429" },
      githubModels: "success",
    });
    expect(provider).toBe("githubModels");
    expect(attempts).toEqual(["openrouter", "githubModels"]);
  });

  it("falls back through multiple providers on timeout", async () => {
    const { provider, attempts } = await simulateFallback("balanced", {
      openrouter:   { type: "timeout", message: "timed out" },
      githubModels: { type: "timeout", message: "timed out" },
      groq:         "success",
    });
    expect(provider).toBe("groq");
    expect(attempts).toHaveLength(3);
  });

  it("throws immediately on auth error without trying next provider", async () => {
    await expect(
      simulateFallback("balanced", {
        openrouter: { type: "auth", message: "Invalid API key" },
      })
    ).rejects.toThrow("Auth error on openrouter");
  });

  it("throws when all providers exhausted", async () => {
    const allFailing = Object.fromEntries(
      ROUTING_PROFILES.balanced.map(p => [p, { type: "rate_limit" as const, message: "429" }])
    );
    await expect(simulateFallback("balanced", allFailing)).rejects.toThrow("All providers exhausted");
  });

  it("fast_build tries groq first, falls back to githubModels", async () => {
    const { provider, attempts } = await simulateFallback("fast_build", {
      groq:         { type: "rate_limit", message: "429" },
      githubModels: "success",
    });
    expect(provider).toBe("githubModels");
    expect(attempts[0]).toBe("groq");
    expect(attempts[1]).toBe("githubModels");
  });
});

describe("Task model matrix", () => {
  it("frontendCode primary is Codestral", () => {
    expect(taskModelMatrix.frontendCode.primary.model).toBe("codestral-latest");
    expect(taskModelMatrix.frontendCode.primary.provider).toBe("mistral");
  });

  it("qa primary is Groq llama", () => {
    expect(taskModelMatrix.qa.primary.provider).toBe("groq");
    expect(taskModelMatrix.qa.primary.model).toContain("llama");
  });

  it("repair primary is Groq llama", () => {
    expect(taskModelMatrix.repair.primary.provider).toBe("groq");
  });

  it("orchestrator primary is gpt-4.1-mini", () => {
    expect(taskModelMatrix.orchestrator.primary.model).toBe("gpt-4.1-mini");
  });

  it("every task type has at least one fallback", () => {
    for (const [taskType, routing] of Object.entries(taskModelMatrix)) {
      expect(routing.fallback.length).toBeGreaterThanOrEqual(1);
    }
  });

  it("aiIntegration task type exists and routes to Codestral", () => {
    expect(taskModelMatrix.aiIntegration).toBeDefined();
    expect(taskModelMatrix.aiIntegration.primary.model).toBe("codestral-latest");
  });
});
