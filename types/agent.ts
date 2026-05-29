import { z } from "zod";

export const TaskStatus = z.enum(["pending", "running", "completed", "failed", "skipped"]);

export const TaskSchema = z.object({
  id:             z.string().uuid(),
  title:          z.string(),
  description:    z.string(),
  assigned_agent: z.string(),
  status:         TaskStatus,
  priority:       z.number().int().min(1).max(10).default(5),
  dependencies:   z.array(z.string()).default([]),
  input_refs:     z.array(z.unknown()).default([]),
  output_refs:    z.array(z.unknown()).default([]),
  errors:         z.array(z.string()).default([]),
  retry_count:    z.number().int().default(0),
  max_retries:    z.number().int().default(3),
  provider:       z.string().optional(),
  model:          z.string().optional(),
  tokens_used:    z.number().optional(),
  latency_ms:     z.number().optional(),
});
export type Task = z.infer<typeof TaskSchema>;

export interface AgentContext {
  projectId: string; runId: string; userId: string; taskId: string;
  inputs: Record<string, unknown>;
  providerConfig: {
    routingProfile: "free_tier" | "balanced" | "fast_build" | "quality";
    freeTierFirst: boolean; fastRepair: boolean; qualityMode: boolean;
    modelOverrides?: Record<string, { provider: string; model: string }>;
  };
}

export interface AgentResult<T = unknown> {
  success: boolean; output: T; errors: string[];
  metadata: { provider: string; model: string; tokens_used: number; latency_ms: number; provenance: ProvenanceMetadata };
}

export interface ProvenanceMetadata {
  agent: string; model: string; provider: string;
  run_id: string; task_id: string; generated_at: string; version: number;
}
