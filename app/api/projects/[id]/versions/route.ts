import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/utils/auth";
import { createAdminClient } from "@/lib/supabase/admin";

async function assertOwner(req: NextRequest, projectId: string) {
  const user = await requireAuth(req);
  if (!user) return { user: null, error: "Unauthorized", status: 401 as const };
  const admin = createAdminClient();
  const { data } = await admin.from("projects").select("id").eq("id", projectId).eq("user_id", user.id).single();
  if (!data) return { user: null, error: "Project not found", status: 404 as const };
  return { user, error: null, status: 200 as const };
}

/** GET /api/projects/[id]/versions — list all versions */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params;
  const { user, error, status } = await assertOwner(req, projectId);
  if (error) return NextResponse.json({ data: null, error }, { status });

  const admin = createAdminClient();
  const { data: versions, error: listError } = await admin
    .from("project_versions")
    .select("id, version_num, label, snapshot, created_at")
    .eq("project_id", projectId)
    .order("version_num", { ascending: false });

  if (listError) return NextResponse.json({ data: null, error: listError.message }, { status: 500 });
  return NextResponse.json({ data: versions, error: null });
}

/** POST /api/projects/[id]/versions — restore to a specific version */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params;
  const { user, error, status } = await assertOwner(req, projectId);
  if (error) return NextResponse.json({ data: null, error }, { status });

  const body = await req.json().catch(() => null);
  const parsed = z.object({ versionId: z.string().uuid() }).safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ data: null, error: "versionId required" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Verify version belongs to this project
  const { data: version } = await admin
    .from("project_versions")
    .select("id, version_num, snapshot")
    .eq("id", parsed.data.versionId)
    .eq("project_id", projectId)
    .single();

  if (!version) return NextResponse.json({ data: null, error: "Version not found" }, { status: 404 });

  // Soft-delete all files not belonging to this version
  await admin
    .from("project_files")
    .update({ is_deleted: true, updated_at: new Date().toISOString() })
    .eq("project_id", projectId)
    .neq("version_id", parsed.data.versionId);

  // Restore files for this version
  await admin
    .from("project_files")
    .update({ is_deleted: false, updated_at: new Date().toISOString() })
    .eq("project_id", projectId)
    .eq("version_id", parsed.data.versionId);

  // Update project current_version_id
  await admin
    .from("projects")
    .update({ current_version_id: parsed.data.versionId, status: "ready", updated_at: new Date().toISOString() })
    .eq("id", projectId);

  return NextResponse.json({ data: { restored: true, versionId: parsed.data.versionId, versionNum: version.version_num }, error: null });
}
