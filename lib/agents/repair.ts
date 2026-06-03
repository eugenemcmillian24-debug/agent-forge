import { generateStructured } from "@/lib/ai/provider-router";
import { type AgentContext, type AgentResult } from "@/types/agent";
import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";

const RepairOutputSchema = z.object({
  fixed_files: z.array(z.object({
    path:    z.string(),
    content: z.string(),
    changes: z.array(z.string()),
  })),
  unresolved: z.array(z.object({
    file:   z.string(),
    issue:  z.string(),
    reason: z.string(),
  })),
  notes: z.string().optional(),
});
export type RepairOutput = z.infer<typeof RepairOutputSchema>;

const SYSTEM = `You are the Repair Agent for AgentForge. You receive files with specific errors and must fix them.

RULES:
- Fix errors with minimal changes. Do not refactor — only fix what is broken.
- Preserve any // USER_EDIT comments exactly as-is.
- If an import is missing, add it. If the imported module doesn't exist, create a minimal stub file for it.
- Never use 'any' to shortcut type errors — fix the type properly.
- Never remove existing functionality while fixing a bug.
- If a fix requires changing a shared type or interface, update all affected files.
- If you cannot fix an error, report it in unresolved with a specific, actionable reason.
- Every fixed file must be complete and compilable — return the full file content, not a diff.

Return ONLY valid JSON matching the RepairOutput schema.`;

async function persistFixedFiles(
  projectId: string,
  runId: string,
  output: RepairOutput
): Promise<void> {
  if (!output.fixed_files?.length) return;

  const admin = createAdminClient();

  for (const file of output.fixed_files) {
    if (!file.path?.trim() || !file.content?.trim()) continue;

    const cleanPath = file.path.startsWith("/") ? file.path.slice(1) : file.path;

    const { error } = await admin.from("project_files").upsert(
      {
        project_id: projectId,
        path:       cleanPath,
        content:    file.content,
        agent_id:   "repair",
        provenance: {
          agent:        "repair",
          run_id:       runId,
          changes:      file.changes,
          generated_at: new Date().toISOString(),
        },
        is_deleted: false,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "project_id,path", ignoreDuplicates: false }
    );

    if (error) {
      console.error(`[repair] Failed to persist fix for ${cleanPath}:`, error.message);
    } else {
      console.log(`[repair] Persisted fix for ${cleanPath}: ${file.changes.join("; ")}`);
    }
  }
}

export async function runRepair(ctx: AgentContext): Promise<AgentResult<RepairOutput>> {
  const start = Date.now();
  const repairTasks = JSON.stringify(ctx.inputs.repairTasks ?? []);
  const files       = JSON.stringify(ctx.inputs.files ?? []);

  const result = await generateStructured({
    taskType:     "repair",
    systemPrompt: SYSTEM,
    userMessage:  `Fix these issues:\n${repairTasks}\n\nFiles:\n${files.slice(0, 10000)}`,
    schema:       RepairOutputSchema,
    ctx,
  });

  // Persist fixed files back to the database so changes are not lost
  await persistFixedFiles(ctx.projectId, ctx.runId, result.data);

  if (result.data.unresolved?.length) {
    console.warn(
      `[repair] ${result.data.unresolved.length} unresolved issues:`,
      result.data.unresolved.map(u => `${u.file}: ${u.issue}`).join("; ")
    );
  }

  return {
    success: true,
    output:  result.data,
    errors:  result.data.unresolved.map(u => `${u.file}: ${u.issue}`),
    metadata: {
      provider:    result.provider,
      model:       result.model,
      tokens_used: result.usage.total_tokens,
      latency_ms:  Date.now() - start,
      provenance: {
        agent:        "repair",
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
