import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/utils/auth";
import { createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireAuth(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = await createServerClient();
  const { data: project } = await supabase.from("projects").select("id").eq("id", id).eq("user_id", user.id).single();
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data, error } = await supabase.from("project_versions")
    .select("id, version_num, label, created_at")
    .eq("project_id", id)
    .order("version_num", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireAuth(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { versionId } = await req.json().catch(() => ({}));
  if (!versionId) return NextResponse.json({ error: "versionId required" }, { status: 400 });

  const supabase = await createServerClient();
  const admin = createAdminClient();

  // Verify the version belongs to this project and user
  const { data: project } = await supabase.from("projects").select("id").eq("id", id).eq("user_id", user.id).single();
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: version } = await supabase.from("project_versions").select("id, version_num").eq("id", versionId).eq("project_id", id).single();
  if (!version) return NextResponse.json({ error: "Version not found" }, { status: 404 });

  // Restore: copy files from the target version snapshot to active (version_id = null)
  const { data: versionFiles } = await supabase.from("project_files").select("path, content, language, agent_id").eq("project_id", id).eq("version_id", versionId).eq("is_deleted", false);

  if (versionFiles && versionFiles.length > 0) {
    // Soft-delete current active files
    await admin.from("project_files").update({ is_deleted: true, updated_at: new Date().toISOString() }).eq("project_id", id).is("version_id", null);

    // Re-insert as active files
    await admin.from("project_files").insert(
      versionFiles.map(f => ({ project_id: id, path: f.path, content: f.content, language: f.language, agent_id: f.agent_id, is_deleted: false, updated_at: new Date().toISOString() }))
    );
  }

  // Create a new version snapshot marking this restore
  const { data: latestVersion } = await admin.from("project_versions").select("version_num").eq("project_id", id).order("version_num", { ascending: false }).limit(1).single();
  const nextNum = (latestVersion?.version_num ?? 0) + 1;
  await admin.from("project_versions").insert({ project_id: id, version_num: nextNum, label: `v${nextNum} — restored from v${version.version_num}`, created_by: user.id, snapshot: { restoredFrom: versionId, restoredAt: new Date().toISOString() } });

  await admin.from("audit_logs").insert({ user_id: user.id, project_id: id, actor: user.id, action: "version.restore", resource: "project_version", resource_id: versionId, metadata: { restoredVersion: version.version_num } });

  return NextResponse.json({ success: true });
}
