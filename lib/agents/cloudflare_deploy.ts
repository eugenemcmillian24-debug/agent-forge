import { generateStructured } from "@/lib/ai/provider-router";
import { type AgentContext, type AgentResult } from "@/types/agent";
import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";

const CloudflareDeployOutputSchema = z.object({
  wrangler_toml: z.string(),
  deploy_workflow: z.string(),
  open_next_config: z.string(),
  deployment_guide: z.string(),
  notes: z.string().optional(),
});

export type CloudflareDeployOutput = z.infer<typeof CloudflareDeployOutputSchema>;

const SYSTEM = `You are the Cloudflare Deploy Agent for AgentForge. Generate Cloudflare deployment configuration for a Next.js 15 app.

Generate:
- wrangler.toml — Cloudflare Worker config for OpenNext adapter
- .github/workflows/deploy-cloudflare.yml — GitHub Actions deploy workflow
- open-next.config.ts — OpenNext adapter configuration
- docs/DEPLOY.md — deployment guide with step-by-step instructions

Rules:
- Use @opennextjs/cloudflare for Next.js 15 on Cloudflare Workers
- wrangler.toml: name from project, main = .open-next/worker.js, compatibility_date = 2025-06-01, nodejs_compat flag
- Include assets binding for static files
- Deploy workflow: triggers on push to main, runs npm ci + npm run build + wrangler deploy
- Required secrets: list all env vars the app needs as wrangler secrets
- Deployment guide: local dev, staging, production steps
- Include rollback instructions

Return ONLY valid JSON matching the CloudflareDeployOutput schema.`;

async function writeFiles(
  projectId: string,
  runId: string,
  output: CloudflareDeployOutput
): Promise<string[]> {
  const admin = createAdminClient();
  const written: string[] = [];

  const files = [
    { path: "wrangler.toml", content: output.wrangler_toml, language: "toml" },
    { path: ".github/workflows/deploy-cloudflare.yml", content: output.deploy_workflow, language: "yaml" },
    { path: "open-next.config.ts", content: output.open_next_config, language: "typescript" },
    { path: "docs/DEPLOY.md", content: output.deployment_guide, language: "markdown" },
  ];

  for (const file of files) {
    await admin.from("project_files").upsert(
      {
        project_id: projectId,
        path: file.path,
        content: file.content,
        language: file.language,
        agent_id: "cloudflare_deploy",
        provenance: { agent: "cloudflare_deploy", run_id: runId, generated_at: new Date().toISOString() },
        is_deleted: false,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "project_id,path" }
    );
    written.push(file.path);
  }

  return written;
}

export async function runCloudfareDeploy(ctx: AgentContext): Promise<AgentResult<CloudflareDeployOutput>> {
  const start = Date.now();
  const brief = JSON.stringify(ctx.inputs.productBrief ?? ctx.inputs.plan ?? {});
  const arch = JSON.stringify(ctx.inputs.architecture ?? {});

  const result = await generateStructured({
    taskType: "cloudflareOps",
    systemPrompt: SYSTEM,
    userMessage: `Generate Cloudflare deployment config for this project.\n\nProduct Brief: ${brief.slice(0, 2000)}\n\nArchitecture: ${arch.slice(0, 1000)}`,
    schema: CloudflareDeployOutputSchema,
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
        agent: "cloudflare_deploy",
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
