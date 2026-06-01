import { generateStructured } from "@/lib/ai/provider-router";
import { type AgentContext, type AgentResult } from "@/types/agent";
import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";

const FileSchema = z.object({
  path: z.string(),
  content: z.string(),
  language: z.string(),
  description: z.string(),
});

const BackendOutputSchema = z.object({
  files: z.array(FileSchema),
  env_vars: z.array(z.object({ key: z.string(), description: z.string(), required: z.boolean() })),
  notes: z.string().optional(),
});

export type BackendOutput = z.infer<typeof BackendOutputSchema>;

const SYSTEM = `You are the Backend Agent for AgentForge. Given a product brief and architecture, generate complete backend code.

Generate these file types:
- app/api/[resource]/route.ts — REST API routes with GET/POST/PATCH/DELETE
- app/api/auth/ — auth-related routes (signout, callback)
- lib/actions/ — Next.js Server Actions for mutations
- lib/validators/ — Zod schemas for API input validation
- lib/services/ — business logic services
- middleware.ts — auth guards, rate limiting

Rules:
- Use Next.js 15 App Router Route Handlers (not pages/api)
- TypeScript with strict types
- Zod validation on ALL API inputs
- requireAuth() check on every protected route
- Return NextResponse.json() consistently
- Use Supabase admin client for server-side DB operations
- Row Level Security enforced — never bypass RLS in user-facing routes
- Rate limit expensive operations
- Generate 6-12 files covering all API endpoints in the architecture
- Each file must be complete and compilable

Return ONLY valid JSON matching the BackendOutput schema.`;

async function writeFiles(
  projectId: string,
  runId: string,
  output: BackendOutput
): Promise<string[]> {
  const admin = createAdminClient();
  const written: string[] = [];

  for (const file of output.files) {
    if (!file.path || !file.content) continue;
    await admin.from("project_files").upsert(
      {
        project_id: projectId,
        path: file.path,
        content: file.content,
        language: file.language,
        agent_id: "backend",
        provenance: {
          agent: "backend",
          run_id: runId,
          description: file.description,
          generated_at: new Date().toISOString(),
        },
        is_deleted: false,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "project_id,path" }
    );
    written.push(file.path);
  }

  // Write env vars documentation
  if (output.env_vars.length > 0) {
    const envContent = output.env_vars
      .map(v => `${v.key}=${v.required ? "REQUIRED" : "optional"} # ${v.description}`)
      .join("\n");
    await admin.from("project_files").upsert(
      {
        project_id: projectId,
        path: ".env.example",
        content: `# Environment Variables\n# Copy to .env.local and fill in values\n\n${envContent}\n`,
        language: "env",
        agent_id: "backend",
        provenance: { agent: "backend", run_id: runId, generated_at: new Date().toISOString() },
        is_deleted: false,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "project_id,path" }
    );
    written.push(".env.example");
  }

  return written;
}

export async function runBackend(ctx: AgentContext): Promise<AgentResult<BackendOutput>> {
  const start = Date.now();
  const brief = JSON.stringify(ctx.inputs.productBrief ?? ctx.inputs.plan ?? {});
  const arch = JSON.stringify(ctx.inputs.architecture ?? {});

  const result = await generateStructured({
    taskType: "backendCode",
    systemPrompt: SYSTEM,
    userMessage: `Generate backend API code for this product.\n\nProduct Brief: ${brief.slice(0, 3000)}\n\nArchitecture: ${arch.slice(0, 2000)}`,
    schema: BackendOutputSchema,
    ctx,
  });

  await writeFiles(ctx.projectId, ctx.runId, result.data);

  return {
    success: true,
    output: result.data,
    errors: [],
    metadata: {
      provider: result.provider,
      model: result.model,
      tokens_used: result.usage.total_tokens,
      latency_ms: Date.now() - start,
      provenance: {
        agent: "backend",
        model: result.model,
        provider: result.provider,
        run_id: ctx.runId,
        task_id: ctx.taskId,
        generated_at: new Date().toISOString(),
        version: 1,
      },
    },
  };
}
