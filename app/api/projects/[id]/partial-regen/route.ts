import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/utils/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createSSEStream } from "@/lib/streaming/sse";
import { rateLimit } from "@/lib/rate-limit";
import { generateText } from "@/lib/ai/provider-router";
import type { AgentContext } from "@/types/agent";

const PartialRegenSchema = z.object({
  filePath:    z.string().min(1),
  instruction: z.string().min(5).max(2000),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAuth(req);
  if (!user) return NextResponse.json({ data: null, error: "Unauthorized" }, { status: 401 });

  const { id: projectId } = await params;

  const rl = rateLimit(`partial:${user.id}`, { limit: 20, windowMs: 10 * 60 * 1000 });
  if (!rl.success) return NextResponse.json({ data: null, error: "Rate limit exceeded" }, { status: 429 });

  const body = await req.json().catch(() => null);
  const parsed = PartialRegenSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ data: null, error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: project } = await admin
    .from("projects").select("id").eq("id", projectId).eq("user_id", user.id).single();
  if (!project) return NextResponse.json({ data: null, error: "Project not found" }, { status: 404 });

  // Load the target file
  const cleanPath = parsed.data.filePath.startsWith("/") ? parsed.data.filePath.slice(1) : parsed.data.filePath;
  const { data: file } = await admin
    .from("project_files").select("path, content, language")
    .eq("project_id", projectId).eq("path", cleanPath).eq("is_deleted", false).single();

  if (!file) return NextResponse.json({ data: null, error: "File not found" }, { status: 404 });

  const { data: providerConfig } = await admin
    .from("provider_configs").select("*").eq("user_id", user.id).single();

  const resolvedConfig = {
    routingProfile: (providerConfig?.routing_profile ?? "balanced") as "free_tier" | "balanced" | "fast_build" | "quality",
    freeTierFirst: providerConfig?.free_tier_first ?? true,
    fastRepair: false, qualityMode: false,
  };

  return createSSEStream(async (emit) => {
    emit({ type: "partial-regen.started", filePath: cleanPath });

    const { data: run } = await admin.from("agent_runs").insert({
      project_id: projectId, status: "running", trigger: "partial_regen",
      started_at: new Date().toISOString(), metadata: { filePath: cleanPath, instruction: parsed.data.instruction },
    }).select().single();

    const runId = (run?.id ?? "partial") as string;

    try {
      const routerCtx = {
        projectId, runId, userId: user.id, taskId: runId,
        providerConfig: resolvedConfig,
      };

      // Determine task type based on file extension
      const ext = cleanPath.split(".").pop()?.toLowerCase() ?? "";
      const taskType = ["ts", "tsx", "js", "jsx"].includes(ext) ? "frontendCode" as const : "backendCode" as const;

      const result = await generateText({
        taskType,
        systemPrompt: `You are a code editor. The user wants to modify a specific file. Return ONLY the complete updated file content with no explanation, no markdown fences, no commentary. The file must be complete and compilable.`,
        userMessage: `File: ${cleanPath}\n\nCurrent content:\n${(file.content as string).slice(0, 8000)}\n\nInstruction: ${parsed.data.instruction}\n\nReturn the complete updated file:`,
        ctx: routerCtx,
        temperature: 0.2,
        maxTokens: 4000,
      });

      // Strip any accidental markdown fences
      const cleanContent = result.content
        .replace(/^```[\w]*\n?/, "")
        .replace(/\n?```$/, "")
        .trim();

      // Persist updated file
      await admin.from("project_files").upsert({
        project_id: projectId, path: cleanPath,
        content: cleanContent, language: file.language,
        agent_id: "partial_regen",
        provenance: { agent: "partial_regen", run_id: runId, instruction: parsed.data.instruction, generated_at: new Date().toISOString() },
        is_deleted: false, updated_at: new Date().toISOString(),
      }, { onConflict: "project_id,path", ignoreDuplicates: false });

      if (run) {
        await admin.from("agent_runs")
          .update({ status: "completed", completed_at: new Date().toISOString() }).eq("id", runId);
      }

      emit({ type: "partial-regen.completed", filePath: cleanPath, provider: result.provider, model: result.model });

    } catch (err) {
      if (run) {
        await admin.from("agent_runs")
          .update({ status: "failed", error: String(err), completed_at: new Date().toISOString() }).eq("id", runId);
      }
      emit({ type: "partial-regen.failed", error: String(err) });
    }
  });
}
