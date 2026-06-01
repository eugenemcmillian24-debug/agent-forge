import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/utils/auth";
import { createServerClient } from "@/lib/supabase/server";
import { createSSEStream } from "@/lib/streaming/sse";

const TASK_FIELDS =
  "id, title, description, assigned_agent, status, priority, provider, model, tokens_used, latency_ms, errors, created_at, started_at, completed_at";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params;
  const user = await requireAuth(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = await createServerClient();

  // Verify ownership
  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("user_id", user.id)
    .single();
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return createSSEStream(async (emit) => {
    // 1. Send initial snapshot immediately
    const { data: initialTasks } = await supabase
      .from("tasks")
      .select(TASK_FIELDS)
      .eq("project_id", projectId)
      .order("created_at", { ascending: true });

    emit({ type: "snapshot", tasks: initialTasks ?? [] });

    // 2. Subscribe to realtime changes
    await new Promise<void>((resolve) => {
      const channel = supabase
        .channel(`tasks-stream:${projectId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "tasks",
            filter: `project_id=eq.${projectId}`,
          },
          (payload) => {
            emit({
              type: `task.${payload.eventType.toLowerCase()}`,
              task: payload.new ?? payload.old,
            });
          }
        )
        .subscribe();

      // Clean up when the client disconnects
      req.signal.addEventListener("abort", () => {
        supabase.removeChannel(channel);
        resolve();
      });
    });
  });
}
