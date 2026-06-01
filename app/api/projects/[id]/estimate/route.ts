import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/utils/auth";
import { z } from "zod";

const Schema = z.object({
  prompt:         z.string().min(1).max(5000),
  routingProfile: z.enum(["free_tier", "balanced", "fast_build", "quality"]).default("balanced"),
});

// Rough token estimates per agent task type
const AGENT_TOKEN_ESTIMATES: Record<string, { input: number; output: number }> = {
  product_manager:   { input: 800,  output: 1200 },
  architect:         { input: 1200, output: 2000 },
  uiux:              { input: 1000, output: 1500 },
  frontend:          { input: 2000, output: 4000 },
  backend:           { input: 1500, output: 3000 },
  database:          { input: 1000, output: 2000 },
  ai_integration:    { input: 1000, output: 2000 },
  github_agent:      { input: 600,  output: 1200 },
  cloudflare_deploy: { input: 600,  output: 1000 },
  export_agent:      { input: 800,  output: 1500 },
  qa:                { input: 1500, output: 800  },
  repair:            { input: 1000, output: 1500 },
};

// Cost per 1k tokens by provider (USD) — approximate as of mid-2026
const PROVIDER_COSTS: Record<string, { input: number; output: number }> = {
  githubModels: { input: 0,      output: 0      }, // Free tier
  groq:         { input: 0.0006, output: 0.0006 }, // llama-3.3-70b
  mistral:      { input: 0.003,  output: 0.009  }, // codestral
  openrouter:   { input: 0.002,  output: 0.006  }, // avg
  huggingface:  { input: 0,      output: 0      }, // Free inference
};

// Routing profile → primary provider mapping
const PROFILE_PROVIDERS: Record<string, string[]> = {
  free_tier:  ["githubModels", "openrouter", "groq", "huggingface", "mistral"],
  balanced:   ["openrouter", "githubModels", "groq", "mistral", "huggingface"],
  fast_build: ["groq", "githubModels", "openrouter", "mistral", "huggingface"],
  quality:    ["mistral", "githubModels", "openrouter", "groq", "huggingface"],
};

export async function POST(req: NextRequest) {
  const user = await requireAuth(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body   = await req.json().catch(() => ({}));
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const { prompt, routingProfile } = parsed.data;

  // Estimate number of tasks based on prompt complexity
  const promptWords = prompt.split(/\s+/).length;
  const complexity  = promptWords < 20 ? "simple" : promptWords < 60 ? "medium" : "complex";
  const taskCount   = complexity === "simple" ? 8 : complexity === "medium" ? 10 : 12;

  // Calculate token estimates
  const agents = Object.keys(AGENT_TOKEN_ESTIMATES).slice(0, taskCount);
  let totalInputTokens  = 0;
  let totalOutputTokens = 0;

  for (const agent of agents) {
    const est = AGENT_TOKEN_ESTIMATES[agent];
    totalInputTokens  += est.input;
    totalOutputTokens += est.output;
  }

  // Add prompt tokens to input
  totalInputTokens += Math.ceil(promptWords * 1.3); // ~1.3 tokens per word

  // Calculate cost for primary provider in profile
  const primaryProvider = PROFILE_PROVIDERS[routingProfile][0];
  const costs = PROVIDER_COSTS[primaryProvider] ?? PROVIDER_COSTS.openrouter;
  const estimatedCost = (totalInputTokens / 1000) * costs.input + (totalOutputTokens / 1000) * costs.output;

  // Estimate time (rough: ~500 tokens/sec for fast providers, ~200 for quality)
  const tokensPerSec = routingProfile === "fast_build" ? 500 : routingProfile === "quality" ? 150 : 300;
  const estimatedSeconds = Math.ceil(totalOutputTokens / tokensPerSec);

  return NextResponse.json({
    complexity,
    taskCount,
    tokens: {
      input:  totalInputTokens,
      output: totalOutputTokens,
      total:  totalInputTokens + totalOutputTokens,
    },
    cost: {
      estimated_usd: estimatedCost,
      provider:      primaryProvider,
      is_free:       estimatedCost === 0,
    },
    time: {
      estimated_seconds: estimatedSeconds,
      estimated_label:
        estimatedSeconds < 60 ? `~${estimatedSeconds}s` :
        estimatedSeconds < 120 ? "~1-2 min" : `~${Math.ceil(estimatedSeconds / 60)} min`,
    },
    routing_profile: routingProfile,
  });
}
