import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/utils/auth";
import { createServerClient } from "@/lib/supabase/server";
import { runRepair } from "@/lib/agents/repair";
import { checkRateLimit } from "@/lib/utils/rate-limit";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireAuth(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const allowed = await checkRateLimit(user.id, "repair", 30, "1h");
  if (!allowed) return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });

  const supabase = await createServerClient();
  const { data: project } = await supabase.from("projects").select("id").eq("id", id).eq("user_id", user.id).single();
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const { data: files } = await supabase.from("project_files").select("path, content").eq("project_id", id).limit(30);

  const result = await runRepair({
    projectId: id, runId: "repair", userId: user.id, taskId: "repair-0",
    inputs: { repairTasks: body.repairTasks ?? [], files: files ?? [] },
    providerConfig: { routingProfile: "fast_build", freeTierFirst: false, fastRepair: true, qualityMode: false },
  });

  return NextResponse.json(result);
}
