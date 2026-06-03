import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/utils/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createSSEStream } from "@/lib/streaming/sse";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAuth(req);
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const { id: projectId } = await params;
  const admin = createAdminClient();

  const { data: project } = await admin
    .from("projects").select("id").eq("id", projectId).eq("user_id", user.id).single();
  if (!project) {
    return new Response(JSON.stringify({ error: "Project not found" }), { status: 404 });
  }

  return createSSEStream(async (emit) => {
    // Send initial snapshot of all tasks for this project
    const { data: tasks } = await admin
      .from("tasks")
      .select("id, title, description, assigned_agent, status, priority, provider, model, tokens_used, latency_ms, errors, started_at, completed_at, created_at")
      .eq("project_id", projectId)
      .order("priority", { ascending: false });

    emit({ type: "snapshot", tasks: tasks ?? [] });

    // Poll for changes every 2 seconds while the client is connected
    // (Supabase Realtime requires a separate WS connection; polling keeps this
    //  route self-contained and compatible with Cloudflare Workers)
    let lastSnapshot = JSON.stringify(tasks ?? []);
    let pollCount = 0;
    const MAX_POLLS = 300; // 10 minutes max stream duration

    await new Promise<void>((resolve) => {
      const interval = setInterval(async () => {
        pollCount++;
        if (pollCount >= MAX_POLLS) { clearInterval(interval); resolve(); return; }

        const { data: current } = await admin
          .from("tasks")
          .select("id, title, description, assigned_agent, status, priority, provider, model, tokens_used, latency_ms, errors, started_at, completed_at, created_at")
          .eq("project_id", projectId)
          .order("priority", { ascending: false });

        const currentStr = JSON.stringify(current ?? []);
        if (currentStr === lastSnapshot) return;

        const prev: Record<string, unknown>[] = JSON.parse(lastSnapshot);
        const next: Record<string, unknown>[] = current ?? [];

        // Diff: emit individual task.update events
        for (const task of next) {
          const prevTask = prev.find((t) => t.id === task.id);
          if (!prevTask) {
            emit({ type: "task.insert", task });
          } else if (JSON.stringify(prevTask) !== JSON.stringify(task)) {
            emit({ type: "task.update", task });
          }
        }

        lastSnapshot = currentStr;
      }, 2000);
    });
  });
}
