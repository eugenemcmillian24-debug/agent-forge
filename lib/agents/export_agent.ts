import { generateStructured } from "@/lib/ai/provider-router";
import { type AgentContext, type AgentResult } from "@/types/agent";
import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";

const ExportAgentOutputSchema = z.object({
  readme: z.string(),
  setup_guide: z.string(),
  env_example: z.string(),
  architecture_doc: z.string(),
  api_docs: z.string().optional(),
  notes: z.string().optional(),
});

export type ExportAgentOutput = z.infer<typeof ExportAgentOutputSchema>;

const SYSTEM = `You are the Export Agent for AgentForge. Generate project documentation and setup files.

Generate:
- README.md — comprehensive project README
- docs/SETUP.md — detailed local development setup guide
- .env.example — all environment variables with descriptions
- docs/ARCHITECTURE.md — technical architecture overview
- docs/API.md — API endpoint documentation (optional, if project has an API)

Rules:
- README: project description, features, tech stack, quick start, screenshots placeholder, contributing
- SETUP: prerequisites, step-by-step local setup, database setup, running tests, common issues
- .env.example: every env var with comment explaining what it is and where to get it
- ARCHITECTURE: system diagram (ASCII), component descriptions, data flow, tech decisions
- API docs: endpoint list with method, path, auth, request/response examples
- Write for a developer audience — be specific and accurate
- Include badges in README (build status, license, etc.)

Return ONLY valid JSON matching the ExportAgentOutput schema.`;

async function writeFiles(
  projectId: string,
  runId: string,
  output: ExportAgentOutput
): Promise<string[]> {
  const admin = createAdminClient();
  const written: string[] = [];

  const files = [
    { path: "README.md", content: output.readme, language: "markdown" },
    { path: "docs/SETUP.md", content: output.setup_guide, language: "markdown" },
    { path: ".env.example", content: output.env_example, language: "env" },
    { path: "docs/ARCHITECTURE.md", content: output.architecture_doc, language: "markdown" },
  ];

  if (output.api_docs) {
    files.push({ path: "docs/API.md", content: output.api_docs, language: "markdown" });
  }

  for (const file of files) {
    await admin.from("project_files").upsert(
      {
        project_id: projectId,
        path: file.path,
        content: file.content,
        language: file.language,
        agent_id: "export_agent",
        provenance: { agent: "export_agent", run_id: runId, generated_at: new Date().toISOString() },
        is_deleted: false,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "project_id,path" }
    );
    written.push(file.path);
  }

  return written;
}

export async function runExportAgent(ctx: AgentContext): Promise<AgentResult<ExportAgentOutput>> {
  const start = Date.now();
  const brief = JSON.stringify(ctx.inputs.productBrief ?? ctx.inputs.plan ?? {});
  const arch = JSON.stringify(ctx.inputs.architecture ?? {});

  const result = await generateStructured({
    taskType: "exportAgent",
    systemPrompt: SYSTEM,
    userMessage: `Generate documentation for this project.\n\nProduct Brief: ${brief.slice(0, 2000)}\n\nArchitecture: ${arch.slice(0, 1500)}`,
    schema: ExportAgentOutputSchema,
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
        agent: "export_agent",
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
