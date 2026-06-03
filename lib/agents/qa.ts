import { generateStructured } from "@/lib/ai/provider-router";
import { type AgentContext, type AgentResult } from "@/types/agent";
import { z } from "zod";

const QAReportSchema = z.object({
  passed:        z.boolean(),
  checks:        z.array(z.object({
    name:    z.string(),
    status:  z.enum(["pass", "fail", "warning", "skip"]),
    message: z.string().optional(),
    file:    z.string().optional(),
    line:    z.number().optional(),
  })),
  errors:        z.array(z.string()),
  warnings:      z.array(z.string()),
  repair_needed: z.boolean(),
  repair_tasks:  z.array(z.object({ file: z.string(), issue: z.string(), context: z.string() })),
});
export type QAReport = z.infer<typeof QAReportSchema>;

const SYSTEM = `You are the QA Agent for AgentForge. Review the generated codebase and check for real, compilable code quality.

CHECK SPECIFICALLY — fail if any of these are violated:
1. IMPORTS: Every import path resolves to a file that was generated. No missing modules. No @supabase/auth-helpers (deprecated — must use @supabase/ssr).
2. ROUTE HANDLERS: Every API route uses NextResponse.json() — no raw Response objects. Every route returns the shape { data: T, error: null } or { data: null, error: string }.
3. CLIENT COMPONENTS: Every component using useState, useEffect, or browser APIs has "use client" as the first line.
4. TYPES: No bare \`any\` types. Type assertions must have a comment explaining why.
5. SUPABASE QUERIES: Every .from() query checks for .error and returns it — no silent failures.
6. AUTH: Every protected route calls getUser() before any DB access and returns 401 if unauthenticated.
7. STUBS: Any file with content shorter than 100 characters is a stub — flag as repair_needed.
8. RLS: Every user-facing table must have RLS enabled. Policies must scope to auth.uid().
9. ENV VARS: Every process.env reference must appear in .env.example.
10. DEPLOYMENT: wrangler.toml or open-next.config.ts must exist if the architecture targets Cloudflare.

Set repair_needed=true if ANY check fails.
For each failure, add a repair_task with the exact file path, the specific issue, and the relevant code context.
Return ONLY valid JSON matching the QAReport schema.`;

export async function runQA(ctx: AgentContext): Promise<AgentResult<QAReport>> {
  const start = Date.now();

  // Build a structured file review — each file gets up to 1,500 chars of content
  // so the model reviews real code, not truncated JSON blobs
  const fileList = (ctx.inputs.files as Array<{ path: string; content: string }> ?? []);
  const filesSummary = fileList
    .map(f => `FILE: ${f.path}\n${(f.content ?? "").slice(0, 1500)}\n---`)
    .join("\n");

  const result = await generateStructured({
    taskType:     "qa",
    systemPrompt: SYSTEM,
    userMessage:  `Review these generated files for TypeScript errors, missing imports, and broken patterns:\n\n${filesSummary.slice(0, 14000)}`,
    schema:       QAReportSchema,
    ctx,
  });

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
        agent:        "qa",
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
