import { generateStructured } from "@/lib/ai/provider-router";
import { type AgentContext, type AgentResult } from "@/types/agent";
import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";

const GitHubAgentOutputSchema = z.object({
  ci_workflow: z.string(),
  deploy_workflow: z.string(),
  pr_template: z.string(),
  gitignore: z.string(),
  readme: z.string(),
  notes: z.string().optional(),
});

export type GitHubAgentOutput = z.infer<typeof GitHubAgentOutputSchema>;

const SYSTEM = `You are the GitHub Agent for AgentForge. Generate GitHub configuration files for the project.

Generate:
- .github/workflows/ci.yml — lint, typecheck, test on push/PR
- .github/workflows/deploy.yml — deploy to Cloudflare Pages on main push
- .github/pull_request_template.md — PR template with checklist
- .gitignore — comprehensive Next.js + Node.js gitignore
- README.md — project README with setup, features, and deploy instructions

Rules:
- CI workflow: runs on push to main and on PRs
- CI steps: npm ci, npm run lint, npm run type-check, npm run build
- Deploy workflow: triggers on CI success for main branch
- Deploy uses wrangler to deploy to Cloudflare Pages
- README includes: project description, quick start, env vars, deploy instructions
- .gitignore covers: node_modules, .next, .env*, dist, .wrangler

Return ONLY valid JSON matching the GitHubAgentOutput schema.`;

async function writeFiles(
  projectId: string,
  runId: string,
  output: GitHubAgentOutput
): Promise<string[]> {
  const admin = createAdminClient();
  const written: string[] = [];

  const files = [
    { path: ".github/workflows/ci.yml", content: output.ci_workflow, language: "yaml" },
    { path: ".github/workflows/deploy.yml", content: output.deploy_workflow, language: "yaml" },
    { path: ".github/pull_request_template.md", content: output.pr_template, language: "markdown" },
    { path: ".gitignore", content: output.gitignore, language: "text" },
    { path: "README.md", content: output.readme, language: "markdown" },
  ];

  for (const file of files) {
    await admin.from("project_files").upsert(
      {
        project_id: projectId,
        path: file.path,
        content: file.content,
        language: file.language,
        agent_id: "github_agent",
        provenance: { agent: "github_agent", run_id: runId, generated_at: new Date().toISOString() },
        is_deleted: false,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "project_id,path", ignoreDuplicates: false }
    );
    written.push(file.path);
  }

  return written;
}

export async function runGitHubAgent(ctx: AgentContext): Promise<AgentResult<GitHubAgentOutput>> {
  const start = Date.now();
  const brief = JSON.stringify(ctx.inputs.productBrief ?? ctx.inputs.plan ?? {});

  const result = await generateStructured({
    taskType: "githubOps",
    systemPrompt: SYSTEM,
    userMessage: `Generate GitHub configuration files for this project.\n\nProduct Brief: ${brief.slice(0, 2000)}`,
    schema: GitHubAgentOutputSchema,
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
        agent: "github_agent",
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
