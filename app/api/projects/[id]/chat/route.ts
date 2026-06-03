import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/utils/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createSSEStream } from "@/lib/streaming/sse";
import { generateText } from "@/lib/ai/provider-router";
import { rateLimit } from "@/lib/rate-limit";

const ChatSchema = z.object({
  message:        z.string().min(1).max(2000),
  conversationId: z.string().uuid().optional(),
});

const CHAT_SYSTEM = `You are a helpful AI assistant embedded in AgentForge, an AI-powered app builder.
The user has a project they're building. Answer questions, suggest improvements, and help them refine their app idea.
Be concise, practical, and developer-friendly. When suggesting code changes, be specific about which files to edit.`;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAuth(req);
  if (!user) return NextResponse.json({ data: null, error: "Unauthorized" }, { status: 401 });

  const { id: projectId } = await params;

  const rl = rateLimit(`chat:${user.id}`, { limit: 30, windowMs: 60 * 1000 });
  if (!rl.success) {
    return NextResponse.json({ data: null, error: "Rate limit exceeded" }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const parsed = ChatSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ data: null, error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  const admin = createAdminClient();

  // Verify project ownership
  const { data: project } = await admin
    .from("projects").select("id, name, description").eq("id", projectId).eq("user_id", user.id).single();
  if (!project) return NextResponse.json({ data: null, error: "Project not found" }, { status: 404 });

  // Get or create conversation
  let conversationId = parsed.data.conversationId;
  if (!conversationId) {
    const { data: conv } = await admin
      .from("conversations")
      .insert({ project_id: projectId, user_id: user.id, title: parsed.data.message.slice(0, 60) })
      .select().single();
    conversationId = conv?.id;
  }

  // Persist user message
  if (conversationId) {
    await admin.from("messages").insert({
      conversation_id: conversationId,
      role: "user",
      content: parsed.data.message,
      metadata: {},
    });
  }

  // Load recent conversation history (last 10 messages for context)
  const history: Array<{ role: "user" | "assistant"; content: string }> = [];
  if (conversationId) {
    const { data: recentMsgs } = await admin
      .from("messages").select("role, content")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: false }).limit(10);
    if (recentMsgs) {
      history.push(...recentMsgs.reverse().map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content as string,
      })));
    }
  }

  const projectContext = `Project: "${project.name}"${project.description ? ` — ${project.description}` : ""}`;

  return createSSEStream(async (emit) => {
    const routerCtx = {
      projectId, runId: "chat", userId: user.id, taskId: "chat",
      providerConfig: { routingProfile: "balanced" as const, freeTierFirst: true, fastRepair: false, qualityMode: false },
    };

    const result = await generateText({
      taskType: "productManager",
      systemPrompt: `${CHAT_SYSTEM}\n\n${projectContext}`,
      userMessage: parsed.data.message,
      ctx: routerCtx,
      temperature: 0.7,
      maxTokens: 800,
    });

    // Persist assistant reply
    if (conversationId) {
      await admin.from("messages").insert({
        conversation_id: conversationId,
        role: "assistant",
        content: result.content,
        metadata: { provider: result.provider, model: result.model, tokens: result.usage.total_tokens },
      });
    }

    emit({
      type:           "message",
      content:        result.content,
      conversationId,
      provider:       result.provider,
      model:          result.model,
    });
  });
}

/** GET /api/projects/[id]/chat — list conversations */
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
  const conversationId = searchParams.get("conversationId");

  if (conversationId) {
    const { data: messages, error } = await admin
      .from("messages").select("*")
      .eq("conversation_id", conversationId)
      .order("created_at");
    if (error) return NextResponse.json({ data: null, error: error.message }, { status: 500 });
    return NextResponse.json({ data: messages, error: null });
  }

  const { data: conversations, error } = await admin
    .from("conversations").select("id, title, created_at, updated_at")
    .eq("project_id", projectId).eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  if (error) return NextResponse.json({ data: null, error: error.message }, { status: 500 });
  return NextResponse.json({ data: conversations, error: null });
}
