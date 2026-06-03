import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/utils/auth";
import { createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { encryptSecret } from "@/lib/utils/crypto";
import { z } from "zod";

const VALID_PROVIDERS = ["github_models", "openrouter", "groq", "mistral", "huggingface", "github", "cloudflare"] as const;

const SaveSchema = z.object({
  provider: z.enum(VALID_PROVIDERS),
  key:      z.string().min(8).max(512),
  label:    z.string().max(80).optional(),
});

const DeleteSchema = z.object({
  provider: z.enum(VALID_PROVIDERS),
});

const PROVIDER_MAP: Record<string, typeof VALID_PROVIDERS[number]> = {
  githubModels: "github_models",
  openrouter:   "openrouter",
  groq:         "groq",
  mistral:      "mistral",
  huggingface:  "huggingface",
  github:       "github",
  cloudflare:   "cloudflare",
};

// Mask using the stored key_hash (32-char hex) — never decrypt just to display.
// Shows first 6 + last 4 chars of the hash, giving the user enough to identify the key.
function maskKeyHash(keyHash: string): string {
  if (keyHash.length <= 10) return "••••••••";
  return keyHash.slice(0, 6) + "••••••••" + keyHash.slice(-4);
}

export async function GET(req: NextRequest) {
  const user = await requireAuth(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("provider_keys")
    .select("provider, label, key_hash, is_active, last_used_at")
    .eq("user_id", user.id)
    .eq("is_active", true);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const masked = (data ?? []).map(k => ({
    provider:     k.provider,
    label:        k.label ?? null,
    masked:       maskKeyHash(k.key_hash),
    last_used_at: k.last_used_at,
  }));

  return NextResponse.json(masked);
}

export async function POST(req: NextRequest) {
  const user = await requireAuth(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  if (body.provider && PROVIDER_MAP[body.provider]) {
    body.provider = PROVIDER_MAP[body.provider];
  }
  const parsed = SaveSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const { provider, key, label } = parsed.data;

  let keyEnc: string;
  try {
    keyEnc = await encryptSecret(key);
  } catch {
    return NextResponse.json({ error: "Encryption not configured — set ENCRYPTION_KEY" }, { status: 500 });
  }

  const encoder = new TextEncoder();
  const hashBuf = await crypto.subtle.digest("SHA-256", encoder.encode(key));
  const keyHash = Array.from(new Uint8Array(hashBuf))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 32);

  const admin = createAdminClient();
  const { error } = await admin.from("provider_keys").upsert(
    { user_id: user.id, provider, key_hash: keyHash, key_enc: keyEnc, label: label ?? null, is_active: true },
    { onConflict: "user_id,provider" }
  );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await admin.from("audit_logs").insert({
    user_id: user.id, actor: user.id,
    action: "provider_key.saved", resource: "provider_key", resource_id: provider,
    metadata: { provider },
  });

  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  const user = await requireAuth(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  if (body.provider && PROVIDER_MAP[body.provider]) body.provider = PROVIDER_MAP[body.provider];
  const parsed = DeleteSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const admin = createAdminClient();
  await admin.from("provider_keys")
    .update({ is_active: false })
    .eq("user_id", user.id)
    .eq("provider", parsed.data.provider);

  return NextResponse.json({ success: true });
}
