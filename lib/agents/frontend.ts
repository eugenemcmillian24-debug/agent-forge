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

const FrontendOutputSchema = z.object({
  files: z.array(FileSchema),
  dependencies: z.array(z.string()),
  notes: z.string().optional(),
});

export type FrontendOutput = z.infer<typeof FrontendOutputSchema>;

const SYSTEM = `You are the Frontend Agent for AgentForge. Given a product brief and architecture, generate complete, production-ready frontend code.

Generate these file types:
- app/page.tsx (landing/home)
- app/layout.tsx (root layout with providers)
- app/(auth)/login/page.tsx and signup/page.tsx
- app/(dashboard)/dashboard/page.tsx
- Key feature pages based on the brief
- components/ui/ — Button, Input, Card, Modal, etc.
- components/[feature]/ — feature-specific components
- hooks/use[Feature].ts — custom hooks

Rules:
- Use Next.js 15 App Router with TypeScript
- Tailwind CSS for styling
- Server Components where possible, Client Components only when needed
- Supabase for auth and data
- Zod for form validation
- Each file must be complete and compilable
- Import paths use @/ alias
- Keep each file focused and under 200 lines
- Generate 8-15 files covering the core user flows

Return ONLY valid JSON matching the FrontendOutput schema.`;

async function writeFiles(
  projectId: string,
  runId: string,
  output: FrontendOutput
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
        agent_id: "frontend",
        provenance: {
          agent: "frontend",
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

  // Write package.json additions as a deps file
  if (output.dependencies.length > 0) {
    await admin.from("project_files").upsert(
      {
        project_id: projectId,
        path: "docs/frontend-dependencies.md",
        content: `# Frontend Dependencies\n\nAdd these to package.json:\n\n\`\`\`\n${output.dependencies.join("\n")}\n\`\`\`\n`,
        language: "markdown",
        agent_id: "frontend",
        provenance: { agent: "frontend", run_id: runId, generated_at: new Date().toISOString() },
        is_deleted: false,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "project_id,path" }
    );
    written.push("docs/frontend-dependencies.md");
  }

  return written;
}

export async function runFrontend(ctx: AgentContext): Promise<AgentResult<FrontendOutput>> {
  const start = Date.now();
  const brief = JSON.stringify(ctx.inputs.productBrief ?? ctx.inputs.plan ?? {});
  const arch = JSON.stringify(ctx.inputs.architecture ?? {});

  const result = await generateStructured({
    taskType: "frontendCode",
    systemPrompt: SYSTEM,
    userMessage: `Generate frontend code for this product.\n\nProduct Brief: ${brief.slice(0, 3000)}\n\nArchitecture: ${arch.slice(0, 2000)}`,
    schema: FrontendOutputSchema,
    ctx,
  });

  const written = await writeFiles(ctx.projectId, ctx.runId, result.data);

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
        agent: "frontend",
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
