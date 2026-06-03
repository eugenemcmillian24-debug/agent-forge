import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/utils/auth";
import { createAdminClient } from "@/lib/supabase/admin";

const FileUpdateSchema = z.object({
  path:    z.string().min(1),
  content: z.string(),
  language: z.string().optional(),
});

async function assertProjectOwner(req: NextRequest, projectId: string) {
  const user = await requireAuth(req);
  if (!user) return { user: null, error: "Unauthorized", status: 401 as const };
  const admin = createAdminClient();
  const { data } = await admin
    .from("projects").select("id").eq("id", projectId).eq("user_id", user.id).single();
  if (!data) return { user: null, error: "Project not found", status: 404 as const };
  return { user, error: null, status: 200 as const };
}

/** GET /api/projects/[id]/files — list all non-deleted files */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params;
  const { user, error, status } = await assertProjectOwner(req, projectId);
  if (error) return NextResponse.json({ data: null, error }, { status });

  const { searchParams } = new URL(req.url);
  const filePath = searchParams.get("path");

  const admin = createAdminClient();

  if (filePath) {
    // Single file with content
    const { data: file, error: fileError } = await admin
      .from("project_files")
      .select("id, path, content, language, agent_id, provenance, updated_at")
      .eq("project_id", projectId)
      .eq("path", filePath)
      .eq("is_deleted", false)
      .single();

    if (fileError || !file) {
      return NextResponse.json({ data: null, error: "File not found" }, { status: 404 });
    }
    return NextResponse.json({ data: file, error: null });
  }

  // File tree — paths only (no content to keep response small)
  const { data: files, error: listError } = await admin
    .from("project_files")
    .select("id, path, language, agent_id, updated_at")
    .eq("project_id", projectId)
    .eq("is_deleted", false)
    .order("path");

  if (listError) return NextResponse.json({ data: null, error: listError.message }, { status: 500 });
  return NextResponse.json({ data: files, error: null });
}

/** PUT /api/projects/[id]/files — create or update a file */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params;
  const { user, error, status } = await assertProjectOwner(req, projectId);
  if (error) return NextResponse.json({ data: null, error }, { status });

  const body = await req.json().catch(() => null);
  const parsed = FileUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ data: null, error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  const admin = createAdminClient();
  const cleanPath = parsed.data.path.startsWith("/") ? parsed.data.path.slice(1) : parsed.data.path;

  const { data: file, error: upsertError } = await admin
    .from("project_files")
    .upsert({
      project_id: projectId,
      path:       cleanPath,
      content:    parsed.data.content,
      language:   parsed.data.language ?? inferLanguage(cleanPath),
      agent_id:   "user",
      provenance: { agent: "user", edited_by: user!.id, edited_at: new Date().toISOString() },
      is_deleted: false,
      updated_at: new Date().toISOString(),
    }, { onConflict: "project_id,path", ignoreDuplicates: false })
    .select()
    .single();

  if (upsertError) return NextResponse.json({ data: null, error: upsertError.message }, { status: 500 });
  return NextResponse.json({ data: file, error: null });
}

/** DELETE /api/projects/[id]/files?path=... — soft-delete a file */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params;
  const { user, error, status } = await assertProjectOwner(req, projectId);
  if (error) return NextResponse.json({ data: null, error }, { status });

  const { searchParams } = new URL(req.url);
  const filePath = searchParams.get("path");
  if (!filePath) return NextResponse.json({ data: null, error: "path query param required" }, { status: 400 });

  const admin = createAdminClient();
  const { error: deleteError } = await admin
    .from("project_files")
    .update({ is_deleted: true, updated_at: new Date().toISOString() })
    .eq("project_id", projectId)
    .eq("path", filePath);

  if (deleteError) return NextResponse.json({ data: null, error: deleteError.message }, { status: 500 });
  return NextResponse.json({ data: { deleted: true, path: filePath }, error: null });
}

function inferLanguage(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    ts: "typescript", tsx: "tsx", js: "javascript", jsx: "jsx",
    css: "css", json: "json", md: "markdown", sql: "sql",
    yaml: "yaml", yml: "yaml", toml: "toml", sh: "shell",
    env: "env", html: "html",
  };
  return map[ext] ?? "text";
}
