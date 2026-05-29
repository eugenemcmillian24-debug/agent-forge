import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/utils/auth";
import { createServerClient } from "@/lib/supabase/server";
import { providerRegistry } from "@/lib/ai/provider-registry";

export async function GET(req: NextRequest) {
  const user = await requireAuth(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = await createServerClient();
  const { data: config } = await supabase.from("provider_configs").select().eq("user_id", user.id).single();

  // Check which provider env vars are set (server-side only)
  const envStatus: Record<string, boolean> = {
    githubModels: !!(process.env.GITHUB_MODELS_TOKEN || process.env.GITHUB_TOKEN || process.env.SECRET_GITHUB_TOKEN),
    openrouter:   !!(process.env.OPENROUTER_API_KEY || process.env.SECRET_OPENROUTER_API_KEY),
    groq:         !!(process.env.GROQ_API_KEY || process.env.SECRET_GROQ_API_KEY),
    mistral:      !!(process.env.MISTRAL_API_KEY || process.env.SECRET_MISTRAL_API_KEY),
    huggingface:  !!(process.env.HUGGINGFACE_TOKEN || process.env.SECRET_HUGGINGFACE_TOKEN),
  };

  const providers = Object.entries(providerRegistry).map(([key, reg]) => ({
    id: key,
    type: reg.type,
    connected: envStatus[key] ?? false,
    lastError: null,
    models: reg.defaultModels,
  }));

  return NextResponse.json({ providers, config: config ?? null });
}
