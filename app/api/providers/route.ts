import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/utils/auth";
import { createServerClient } from "@/lib/supabase/server";
import { providerRegistry } from "@/lib/ai/provider-registry";

export async function GET(req: NextRequest) {
  const user = await requireAuth(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = await createServerClient();
  const { data: config } = await supabase
    .from("provider_configs").select().eq("user_id", user.id).single();

  // Check server env vars for system-level keys (Cloudflare Workers env)
  // Note: SECRET_GITHUB_TOKEN is the server's own token — it must NOT be
  // counted as the user's GitHub Models connection. Only GITHUB_MODELS_TOKEN
  // is a user-facing AI provider key.
  const envStatus: Record<string, boolean> = {
    githubModels: !!(process.env.GITHUB_MODELS_TOKEN),
    openrouter:   !!(process.env.OPENROUTER_API_KEY   || process.env.SECRET_OPENROUTER_API_KEY),
    groq:         !!(process.env.GROQ_API_KEY          || process.env.SECRET_GROQ_API_KEY),
    mistral:      !!(process.env.MISTRAL_API_KEY       || process.env.SECRET_MISTRAL_API_KEY),
    huggingface:  !!(process.env.HUGGINGFACE_TOKEN     || process.env.SECRET_HUGGINGFACE_TOKEN),
  };

  // Also check user-saved keys in the DB — if a user has saved their own key,
  // mark that provider as connected regardless of server env vars.
  const { data: savedKeys } = await supabase
    .from("provider_keys")
    .select("provider")
    .eq("user_id", user.id)
    .eq("is_active", true);

  const userKeyProviders = new Set(
    (savedKeys ?? []).map(k =>
      // Normalize DB snake_case back to camelCase for the registry
      k.provider.replace(/_([a-z])/g, (_: string, c: string) => c.toUpperCase())
    )
  );

  const providers = Object.entries(providerRegistry).map(([key, reg]) => ({
    id:        key,
    type:      reg.type,
    connected: envStatus[key] === true || userKeyProviders.has(key),
    lastError: null,
    models:    reg.defaultModels,
  }));

  return NextResponse.json({ providers, config: config ?? null });
}
