import { generateStructured } from "@/lib/ai/provider-router";
import { type AgentContext, type AgentResult } from "@/types/agent";
import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";

const FileSchema = z.object({
  path:        z.string(),
  content:     z.string(),
  language:    z.string(),
  description: z.string(),
});

const AIIntegrationOutputSchema = z.object({
  files:               z.array(FileSchema),
  providers_used:      z.array(z.string()),
  streaming_supported: z.boolean(),
  notes:               z.string().optional(),
});

export type AIIntegrationOutput = z.infer<typeof AIIntegrationOutputSchema>;

const SYSTEM = `You are the AI Integration Agent for AgentForge. Generate the AI provider abstraction layer for the target app.

Generate:
- lib/ai/client.ts — unified AI client with provider switching
- lib/ai/stream.ts — streaming response handler (SSE or ReadableStream)
- lib/ai/prompts.ts — system prompts and prompt templates
- app/api/ai/chat/route.ts — streaming chat endpoint
- hooks/useChat.ts — client-side chat hook with streaming
- types/ai.ts — TypeScript types for AI responses

CODE QUALITY RULES:
- Support streaming responses with proper SSE using ReadableStream
- Abstract over OpenAI-compatible APIs (works with GitHub Models, Groq, Mistral, OpenRouter)
- Include error handling and retry logic with exponential backoff
- Type-safe prompt templates — no string concatenation for prompts
- Token counting and cost estimation helpers
- The chat route must use NextResponse with a streaming ReadableStream body
- The useChat hook must handle streaming chunks, loading state, and error state
- Every file must be complete and compilable with strict TypeScript

Return ONLY valid JSON matching the AIIntegrationOutput schema.`;

async function writeFiles(
  projectId: string,
  runId: string,
  output: AIIntegrationOutput
): Promise<string[]> {
  const admin = createAdminClient();
  const written: string[] = [];

  for (const file of output.files) {
    if (!file.path || !file.content) continue;
    const cleanPath = file.path.startsWith("/") ? file.path.slice(1) : file.path;
    const { error } = await admin.from("project_files").upsert(
      {
        project_id: projectId,
        path:       cleanPath,
        content:    file.content,
        language:   file.language,
        agent_id:   "ai_integration",
        provenance: {
          agent:        "ai_integration",
          run_id:       runId,
          description:  file.description,
          generated_at: new Date().toISOString(),
        },
        is_deleted: false,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "project_id,path", ignoreDuplicates: false }
    );
    if (error) {
      console.error(`[ai_integration] Failed to write ${cleanPath}:`, error.message);
    } else {
      written.push(cleanPath);
    }
  }

  return written;
}

export async function runAIIntegration(ctx: AgentContext): Promise<AgentResult<AIIntegrationOutput>> {
  const start = Date.now();
  const brief = JSON.stringify(ctx.inputs.productBrief ?? ctx.inputs.plan ?? {});
  const arch  = JSON.stringify(ctx.inputs.architecture ?? {});

  const result = await generateStructured({
    // Fixed: use "aiIntegration" task type so the task-model-matrix routes
    // correctly to codestral-latest (primary) with proper fallbacks.
    // Previously this was incorrectly set to "frontendCode", which bypassed
    // the aiIntegration matrix entry and ignored model overrides for this task.
    taskType:     "aiIntegration",
    systemPrompt: SYSTEM,
    userMessage:  `Generate AI integration code for this product.\n\nProduct Brief: ${brief.slice(0, 2000)}\n\nArchitecture: ${arch.slice(0, 1500)}`,
    schema:       AIIntegrationOutputSchema,
    ctx,
  });

  const written = await writeFiles(ctx.projectId, ctx.runId, result.data);
  if (written.length) console.log(`[ai_integration] wrote ${written.length} files: ${written.join(", ")}`);

  return {
    success: true,
    output:  result.data,
    errors:  [],
    metadata: {
      provider:    result.provider,
      model:       result.model,
      tokens_used: result.usage.total_tokens,
      latency_ms:  Date.now() - start,
      provenance: {
        agent:        "ai_integration",
        model:        result.model,
        provider:     result.provider,
        run_id:       ctx.runId,
        task_id:      ctx.taskId,
        generated_at: new Date().toISOString(),
        version:      1,
      },
    },
  };
}
