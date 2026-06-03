import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/utils/auth";
import { createAdminClient } from "@/lib/supabase/admin";

const UpdateSchema = z.object({
  name:        z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  status:      z.enum(["draft","generating","ready","error","archived"]).optional(),
  metadata:    z.record(z.unknown()).optional(),
});

async function getAuthedProject(req: NextRequest, projectId: string) {
  const user = await requireAuth(req);
  if (!user) return { user: null, project: null, error: "Unauthorized", status: 401 };
  const admin = createAdminClient();
  const { data: project, error } = await admin
    .from("projects").select("*").eq("id", projectId).eq("user_id", user.id).single();
  if (error || !project) return { user, project: null, error: "Project not found", status: 404 };
  return { user, project, error: null, status: 200 };
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params;
  const { user, project, error, status } = await getAuthedProject(req, projectId);
  if (error) return NextResponse.json({ data: null, error }, { status });
  return NextResponse.json({ data: project, error: null });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params;
  const { user, error, status } = await getAuthedProject(req, projectId);
  if (error) return NextResponse.json({ data: null, error }, { status });

  const body = await req.json().catch(() => null);
  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ data: null, error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error: updateError } = await admin
    .from("projects").update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq("id", projectId).eq("user_id", user!.id).select().single();

  if (updateError) return NextResponse.json({ data: null, error: updateError.message }, { status: 500 });
  return NextResponse.json({ data, error: null });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params;
  const { user, error, status } = await getAuthedProject(req, projectId);
  if (error) return NextResponse.json({ data: null, error }, { status });

  const admin = createAdminClient();
  const { error: deleteError } = await admin
    .from("projects").update({ status: "archived", updated_at: new Date().toISOString() })
    .eq("id", projectId).eq("user_id", user!.id);

  if (deleteError) return NextResponse.json({ data: null, error: deleteError.message }, { status: 500 });
  return NextResponse.json({ data: { id: projectId, archived: true }, error: null });
}
