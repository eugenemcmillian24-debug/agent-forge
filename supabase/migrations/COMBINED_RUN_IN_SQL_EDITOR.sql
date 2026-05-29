CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free','pro','team')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  template TEXT CHECK (template IN ('saas-dashboard','ai-chat','crm','content-generator','marketplace','portfolio','custom')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','generating','ready','error','archived')),
  current_version_id UUID,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.project_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  version_num INTEGER NOT NULL,
  label TEXT,
  snapshot JSONB NOT NULL DEFAULT '{}',
  created_by UUID NOT NULL REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (project_id, version_num)
);

ALTER TABLE public.projects ADD CONSTRAINT fk_projects_current_version FOREIGN KEY (current_version_id) REFERENCES public.project_versions(id) ON DELETE SET NULL;

CREATE TABLE public.project_files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  version_id UUID REFERENCES public.project_versions(id) ON DELETE SET NULL,
  path TEXT NOT NULL,
  content TEXT,
  storage_path TEXT,
  language TEXT,
  agent_id TEXT,
  provenance JSONB NOT NULL DEFAULT '{}',
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (project_id, path, version_id)
);

CREATE TABLE public.conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user','assistant','system','tool')),
  content TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.agent_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES public.conversations(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','running','completed','failed','cancelled')),
  trigger TEXT NOT NULL DEFAULT 'user' CHECK (trigger IN ('user','repair','partial_regen','scheduled')),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  run_id UUID NOT NULL REFERENCES public.agent_runs(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  assigned_agent TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','running','completed','failed','skipped')),
  priority INTEGER NOT NULL DEFAULT 5,
  dependencies UUID[] NOT NULL DEFAULT '{}',
  input_refs JSONB NOT NULL DEFAULT '[]',
  output_refs JSONB NOT NULL DEFAULT '[]',
  errors JSONB NOT NULL DEFAULT '[]',
  retry_count INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 3,
  provider TEXT,
  model TEXT,
  tokens_used INTEGER,
  latency_ms INTEGER,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.deployments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  version_id UUID REFERENCES public.project_versions(id),
  target TEXT NOT NULL CHECK (target IN ('cloudflare_pages','cloudflare_workers')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','deploying','deployed','failed','rolled_back')),
  deploy_url TEXT,
  cf_project_name TEXT,
  cf_deployment_id TEXT,
  commit_sha TEXT,
  logs TEXT,
  deployed_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.exports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  version_id UUID REFERENCES public.project_versions(id),
  storage_path TEXT NOT NULL,
  file_count INTEGER NOT NULL DEFAULT 0,
  size_bytes BIGINT NOT NULL DEFAULT 0,
  manifest JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.provider_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('github_models','openrouter','groq','mistral','huggingface','github','cloudflare')),
  key_hash TEXT NOT NULL,
  key_enc TEXT NOT NULL,
  label TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_used_at TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, provider)
);

CREATE TABLE public.provider_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  routing_profile TEXT NOT NULL DEFAULT 'balanced' CHECK (routing_profile IN ('free_tier','balanced','fast_build','quality')),
  free_tier_first BOOLEAN NOT NULL DEFAULT TRUE,
  fast_repair BOOLEAN NOT NULL DEFAULT FALSE,
  quality_mode BOOLEAN NOT NULL DEFAULT FALSE,
  config JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id)
);

CREATE TABLE public.model_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  task_type TEXT NOT NULL,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, task_type)
);

CREATE TABLE public.github_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  login TEXT NOT NULL,
  token_enc TEXT NOT NULL,
  scope TEXT[],
  repo_url TEXT,
  commit_sha TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id)
);

CREATE TABLE public.cloudflare_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  account_id TEXT NOT NULL,
  token_enc TEXT NOT NULL,
  zone_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id)
);

CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  run_id UUID REFERENCES public.agent_runs(id) ON DELETE SET NULL,
  task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  resource TEXT,
  resource_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deployments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.model_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.github_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cloudflare_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own" ON public.users FOR ALL USING (auth.uid() = id);
CREATE POLICY "projects_owner" ON public.projects FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "versions_owner" ON public.project_versions FOR ALL USING (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.user_id = auth.uid()));
CREATE POLICY "files_owner" ON public.project_files FOR ALL USING (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.user_id = auth.uid()));
CREATE POLICY "conversations_owner" ON public.conversations FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "messages_owner" ON public.messages FOR ALL USING (EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = conversation_id AND c.user_id = auth.uid()));
CREATE POLICY "runs_owner" ON public.agent_runs FOR ALL USING (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.user_id = auth.uid()));
CREATE POLICY "tasks_owner" ON public.tasks FOR ALL USING (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.user_id = auth.uid()));
CREATE POLICY "deployments_owner" ON public.deployments FOR ALL USING (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.user_id = auth.uid()));
CREATE POLICY "exports_owner" ON public.exports FOR ALL USING (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.user_id = auth.uid()));
CREATE POLICY "provider_keys_owner" ON public.provider_keys FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "provider_configs_owner" ON public.provider_configs FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "model_prefs_owner" ON public.model_preferences FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "github_conn_owner" ON public.github_connections FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "cf_conn_owner" ON public.cloudflare_connections FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "audit_read_own" ON public.audit_logs FOR SELECT USING (auth.uid() = user_id);
CREATE INDEX idx_projects_user_id ON public.projects (user_id);
CREATE INDEX idx_projects_status ON public.projects (status);
CREATE INDEX idx_files_project_id ON public.project_files (project_id);
CREATE INDEX idx_files_version_id ON public.project_files (version_id);
CREATE INDEX idx_files_path ON public.project_files (project_id, path);
CREATE INDEX idx_conversations_project ON public.conversations (project_id);
CREATE INDEX idx_messages_conversation ON public.messages (conversation_id);
CREATE INDEX idx_messages_created ON public.messages (created_at DESC);
CREATE INDEX idx_runs_project ON public.agent_runs (project_id);
CREATE INDEX idx_runs_status ON public.agent_runs (status);
CREATE INDEX idx_tasks_run ON public.tasks (run_id);
CREATE INDEX idx_tasks_status ON public.tasks (status);
CREATE INDEX idx_tasks_agent ON public.tasks (assigned_agent);
CREATE INDEX idx_deployments_project ON public.deployments (project_id);
CREATE INDEX idx_deployments_status ON public.deployments (status);
CREATE INDEX idx_audit_user ON public.audit_logs (user_id);
CREATE INDEX idx_audit_project ON public.audit_logs (project_id);
CREATE INDEX idx_audit_created ON public.audit_logs (created_at DESC);
