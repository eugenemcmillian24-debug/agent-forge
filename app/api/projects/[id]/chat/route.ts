import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/utils/auth";
import { createSSEStream } from "@/lib/streaming/sse";
import { generateText } from "@/lib/ai/provider-router";
import { createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit } from "@/lib/utils/rate-limit";

const Schema = z.object({
  message:        z.string().min(1).max(10000),
  conversationId: z.string().uuid().optional(),
  routingProfile: z.enum(["free_tier","balanced","fast_build","quality"]).default("balanced"),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireAuth(req);
  if (!user) return new Response("Unauthorized", { status: 401 });

  const allowed = await checkRateLimit(user.id, "chat", 60, "1h");
  if (!allowed) return new Response("Rate limit exceeded", { status: 429 });

  const body = await req.json().catch(() => ({}));
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return new Response("Invalid input", { status: 400 });

  const supabase = await createServerClient();
  const admin = createAdminClient();

  let convId = parsed.data.conversationId;
  if (!convId) {
    const { data: conv } = await admin.from("conversations").insert({ project_id: id, user_id: user.id }).select().single();
    convId = conv?.id;
  }

  if (convId) {
    await admin.from("messages").insert({ conversation_id: convId, role: "user", content: parsed.data.message });
  }

  const { data: project } = await supabase.from("projects").select().eq("id", id).single();
  const { data: files } = await supabase.from("project_files").select("path, content").eq("project_id", id).limit(15);
  const fileContext = (files ?? []).map(f => `// ${f.path}\n${(f.content ?? "").slice(0, 400)}`).join("\n\n");

  const systemPrompt = `You are an AI assistant helping refine a ${project?.template ?? "custom"} app called "${project?.name}".
Current project files (sample):\n${fileContext || "(no files yet — project hasn't been generated)"}

Help the user make changes. If they ask for code changes, describe clearly which files to update and what changes to make.
Be concise and direct. If the project has no files yet, suggest they use the Generate button with a detailed prompt.`;

  return createSSEStream(async (emit) => {
    const result = await generateText({
      taskType: "orchestrator",
      systemPrompt,
      userMessage: parsed.data.message,
      ctx: {
        projectId: id, runId: "chat", userId: user.id, taskId: "chat",
        providerConfig: { routingProfile: parsed.data.routingProfile, freeTierFirst: true, fastRepair: false, qualityMode: false },
      },
    });

    if (convId) {
      await admin.from("messages").insert({
        conversation_id: convId, role: "assistant", content: result.content,
        metadata: { provider: result.provider, model: result.model, tokens: result.usage.total_tokens },
      });
    }

    emit({ type: "message", content: result.content, conversationId: convId, provider: result.provider, model: result.model });
  });
}
