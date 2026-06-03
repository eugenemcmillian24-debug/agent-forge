import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/utils/auth";
import { createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireAuth(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const path      = searchParams.get("path");
  const versionId = searchParams.get("versionId");

  const supabase = await createServerClient();

  // Ownership check
  const { data: project } = await supabase
    .from("projects").select("id").eq("id", id).eq("user_id", user.id).single();
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Single file by path (active version only)
  if (path) {
    const { data } = await supabase
      .from("project_files")
      .select("path, content, language, agent_id")
      .eq("project_id", id).eq("path", path).eq("is_deleted", false).single();
    if (!data) return NextResponse.json({ error: "File not found" }, { status: 404 });
    return NextResponse.json(data);
  }

  // Files for a specific version snapshot — used by VersionHistory diff modal
  if (versionId) {
    const { data, error } = await supabase
      .from("project_files")
      .select("path, content, language, agent_id")
      .eq("project_id", id).eq("version_id", versionId).eq("is_deleted", false).order("path");
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data ?? []);
  }

  // Active files: version_id IS NULL = current working set
  const { data, error } = await supabase
    .from("project_files")
    .select("id, path, language, agent_id, updated_at")
    .eq("project_id", id).is("version_id", null).eq("is_deleted", false).order("path");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireAuth(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { path, content } = await req.json();
  if (!path) return NextResponse.json({ error: "path required" }, { status: 400 });

  const supabase = await createServerClient();
  const { data: project } = await supabase
    .from("projects").select("id").eq("id", id).eq("user_id", user.id).single();
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("project_files")
    .upsert(
      { project_id: id, path, content, updated_at: new Date().toISOString(), is_deleted: false },
      { onConflict: "project_id,path" }
    )
    .select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await admin.from("audit_logs").insert({
    user_id: user.id, project_id: id, actor: user.id, action: "file.edited",
    resource: "project_file", resource_id: path,
    metadata: { path, size: content?.length ?? 0 },
  });

  return NextResponse.json(data);
}
