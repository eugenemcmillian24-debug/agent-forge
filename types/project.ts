export type ProjectStatus = "draft" | "generating" | "ready" | "error" | "archived";
export type ProjectTemplate = "saas-dashboard" | "ai-chat" | "crm" | "content-generator" | "marketplace" | "portfolio" | "custom";

export interface Project {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  template?: ProjectTemplate;
  status: ProjectStatus;
  current_version_id?: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface ProjectFile {
  id: string;
  project_id: string;
  path: string;
  content?: string;
  language?: string;
  agent_id?: string;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

export interface Deployment {
  id: string;
  project_id: string;
  target: "cloudflare_pages" | "cloudflare_workers";
  status: "pending" | "deploying" | "deployed" | "failed" | "rolled_back";
  deploy_url?: string;
  deployed_at?: string;
  logs?: string;
  created_at: string;
}

export interface AgentTask {
  id: string;
  run_id: string;
  project_id: string;
  title: string;
  description?: string;
  assigned_agent: string;
  status: "pending" | "running" | "completed" | "failed" | "skipped";
  priority: number;
  provider?: string;
  model?: string;
  tokens_used?: number;
  latency_ms?: number;
  errors: string[];
  created_at: string;
}
