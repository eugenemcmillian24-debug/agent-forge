import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/utils/auth";
import { createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";

const SaveSchema = z.object({
  url:    z.string().url().max(500),
  secret: z.string().max(256).optional(),
  events: z.array(z.enum(["generation.completed", "generation.failed", "deploy.completed"])).default(["generation.completed"]),
});

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user    = await requireAuth(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = await createServerClient();
  const { data: project } = await supabase.from("projects").select("id, metadata").eq("id", id).eq("user_id", user.id).single();
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const webhook = (project.metadata as Record<string, unknown>)?.webhook as Record<string, unknown> | undefined;
  return NextResponse.json(webhook ? { url: webhook.url, events: webhook.events, hasSecret: !!webhook.secret } : null);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user    = await requireAuth(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body   = await req.json().catch(() => ({}));
  const parsed = SaveSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const supabase = await createServerClient();
  const { data: project } = await supabase.from("projects").select("id, metadata").eq("id", id).eq("user_id", user.id).single();
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const admin = createAdminClient();
  const existingMeta = (project.metadata as Record<string, unknown>) ?? {};

  await admin.from("projects").update({
    metadata: {
      ...existingMeta,
      webhook: {
        url:    parsed.data.url,
        events: parsed.data.events,
        secret: parsed.data.secret ?? null,
      },
    },
  }).eq("id", id);

  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user    = await requireAuth(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = await createServerClient();
  const { data: project } = await supabase.from("projects").select("id, metadata").eq("id", id).eq("user_id", user.id).single();
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const admin = createAdminClient();
  const { webhook: _removed, ...rest } = (project.metadata as Record<string, unknown>) ?? {};
  await admin.from("projects").update({ metadata: rest }).eq("id", id);

  return NextResponse.json({ success: true });
}

/**
 * Fire webhook for a project event.
 * Called internally after generation/deploy completes.
 */
export async function fireWebhook(
  projectId: string,
  event: "generation.completed" | "generation.failed" | "deploy.completed",
  payload: Record<string, unknown>
): Promise<void> {
  const admin = createAdminClient();
  const { data: project } = await admin.from("projects").select("metadata").eq("id", projectId).single();
  if (!project) return;

  const webhook = (project.metadata as Record<string, unknown>)?.webhook as Record<string, unknown> | undefined;
  if (!webhook?.url) return;

  const events = (webhook.events as string[]) ?? ["generation.completed"];
  if (!events.includes(event)) return;

  const body = JSON.stringify({ event, project_id: projectId, ...payload, fired_at: new Date().toISOString() });

  try {
    const headers: Record<string, string> = { "Content-Type": "application/json", "User-Agent": "AgentForge/1.0" };
    if (webhook.secret) {
      // HMAC-SHA256 signature
      const key  = await crypto.subtle.importKey("raw", new TextEncoder().encode(webhook.secret as string), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
      const sig  = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
      headers["X-AgentForge-Signature"] = "sha256=" + Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("");
    }
    await fetch(webhook.url as string, { method: "POST", headers, body });
  } catch { /* non-blocking — webhook delivery failures are silent */ }
}
