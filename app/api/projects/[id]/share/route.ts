import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/utils/auth";
import { createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// GET /api/projects/[id]/share — get share status
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user    = await requireAuth(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = await createServerClient();
  const { data: project } = await supabase
    .from("projects").select("id, metadata").eq("id", id).eq("user_id", user.id).single();
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isPublic  = (project.metadata as Record<string, unknown>)?.is_public === true;
  const shareSlug = (project.metadata as Record<string, unknown>)?.share_slug as string | undefined;

  return NextResponse.json({ isPublic, shareUrl: isPublic && shareSlug ? `/share/${shareSlug}` : null });
}

// POST /api/projects/[id]/share — toggle sharing
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user    = await requireAuth(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { enable } = await req.json().catch(() => ({ enable: true }));

  const supabase = await createServerClient();
  const { data: project } = await supabase
    .from("projects").select("id, name, metadata").eq("id", id).eq("user_id", user.id).single();
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const admin = createAdminClient();
  const existingMeta = (project.metadata as Record<string, unknown>) ?? {};

  if (enable) {
    // Generate a stable share slug from project name + id suffix
    const slug = project.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 40) + "-" + id.slice(0, 8);

    await admin.from("projects").update({
      metadata: { ...existingMeta, is_public: true, share_slug: slug },
    }).eq("id", id);

    return NextResponse.json({ isPublic: true, shareUrl: `/share/${slug}` });
  } else {
    await admin.from("projects").update({
      metadata: { ...existingMeta, is_public: false },
    }).eq("id", id);

    return NextResponse.json({ isPublic: false, shareUrl: null });
  }
}
