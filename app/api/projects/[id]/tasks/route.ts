import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/utils/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAuth(req);
  if (!user) return NextResponse.json({ data: null, error: "Unauthorized" }, { status: 401 });

  const { id: projectId } = await params;
  const admin = createAdminClient();

  const { data: project } = await admin
    .from("projects").select("id").eq("id", projectId).eq("user_id", user.id).single();
  if (!project) return NextResponse.json({ data: null, error: "Project not found" }, { status: 404 });

  const { searchParams } = new URL(req.url);
  const runId = searchParams.get("runId");

  let query = admin
    .from("tasks")
    .select("id, title, description, assigned_agent, status, priority, provider, model, tokens_used, latency_ms, errors, started_at, completed_at, created_at")
    .eq("project_id", projectId)
    .order("priority", { ascending: false });

  if (runId) query = query.eq("run_id", runId);

  const { data: tasks, error } = await query;
  if (error) return NextResponse.json({ data: null, error: error.message }, { status: 500 });
  return NextResponse.json({ data: tasks, error: null });
}
