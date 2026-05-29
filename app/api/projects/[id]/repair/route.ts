import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/utils/auth";
import { createServerClient } from "@/lib/supabase/server";
import { runRepair } from "@/lib/agents/repair";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireAuth(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const supabase = createServerClient();
  const { data: files } = await supabase.from("project_files").select("path, content").eq("project_id", params.id).limit(30);

  const result = await runRepair({
    projectId: params.id, runId: "repair", userId: user.id, taskId: "repair-0",
    inputs: { repairTasks: body.repairTasks ?? [], files: files ?? [] },
    providerConfig: { routingProfile: "fast_build", freeTierFirst: false, fastRepair: true, qualityMode: false },
  });

  return NextResponse.json(result);
}
