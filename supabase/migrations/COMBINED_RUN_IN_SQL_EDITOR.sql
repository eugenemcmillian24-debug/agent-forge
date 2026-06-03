-- ══════════════════════════════════════════════════════════════════════
-- AgentForge — Complete Migration (idempotent, run once in SQL Editor)
-- ══════════════════════════════════════════════════════════════════════

-- ── Extensions ────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Auto-update trigger function ──────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ── 001: Core Tables ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free','pro','team')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.projects (
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

CREATE TABLE IF NOT EXISTS public.project_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  version_num INTEGER NOT NULL,
  label TEXT,
  snapshot JSONB NOT NULL DEFAULT '{}',
  created_by UUID NOT NULL REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (project_id, version_num)
);

ALTER TABLE public.projects
  ADD CONSTRAINT IF NOT EXISTS fk_projects_current_version
  FOREIGN KEY (current_version_id) REFERENCES public.project_versions(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS public.project_files (
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

CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user','assistant','system','tool')),
  content TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.agent_runs (
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

CREATE TABLE IF NOT EXISTS public.tasks (
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

CREATE TABLE IF NOT EXISTS public.deployments (
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

CREATE TABLE IF NOT EXISTS public.exports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  version_id UUID REFERENCES public.project_versions(id),
  storage_path TEXT NOT NULL,
  file_count INTEGER NOT NULL DEFAULT 0,
  size_bytes BIGINT NOT NULL DEFAULT 0,
  manifest JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.provider_keys (
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

CREATE TABLE IF NOT EXISTS public.provider_configs (
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

CREATE TABLE IF NOT EXISTS public.model_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  task_type TEXT NOT NULL,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, task_type)
);

CREATE TABLE IF NOT EXISTS public.github_connections (
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

CREATE TABLE IF NOT EXISTS public.cloudflare_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  account_id TEXT NOT NULL,
  token_enc TEXT NOT NULL,
  zone_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id)
);

CREATE TABLE IF NOT EXISTS public.audit_logs (
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

-- ── 002: Rate limit events ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.rate_limit_events (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    TEXT NOT NULL,
  action     TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rate_limit_lookup
  ON public.rate_limit_events (user_id, action, created_at DESC);

ALTER TABLE public.rate_limit_events ENABLE ROW LEVEL SECURITY;

-- ── 002: RLS — enable on all tables ──────────────────────────────────
ALTER TABLE public.users               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_versions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_files       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_runs          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deployments         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exports             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_keys       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_configs    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.model_preferences   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.github_connections  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cloudflare_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs          ENABLE ROW LEVEL SECURITY;

-- ── 002: RLS — policies (idempotent via DO block) ─────────────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='users' AND policyname='users_own') THEN
    CREATE POLICY "users_own" ON public.users FOR ALL USING (auth.uid() = id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='projects' AND policyname='projects_owner') THEN
    CREATE POLICY "projects_owner" ON public.projects FOR ALL USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='project_versions' AND policyname='versions_owner') THEN
    CREATE POLICY "versions_owner" ON public.project_versions FOR ALL
      USING (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.user_id = auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='project_files' AND policyname='files_owner') THEN
    CREATE POLICY "files_owner" ON public.project_files FOR ALL
      USING (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.user_id = auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='conversations' AND policyname='conversations_owner') THEN
    CREATE POLICY "conversations_owner" ON public.conversations FOR ALL USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='messages' AND policyname='messages_owner') THEN
    CREATE POLICY "messages_owner" ON public.messages FOR ALL
      USING (EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = conversation_id AND c.user_id = auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='agent_runs' AND policyname='runs_owner') THEN
    CREATE POLICY "runs_owner" ON public.agent_runs FOR ALL
      USING (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.user_id = auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='tasks' AND policyname='tasks_owner') THEN
    CREATE POLICY "tasks_owner" ON public.tasks FOR ALL
      USING (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.user_id = auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='deployments' AND policyname='deployments_owner') THEN
    CREATE POLICY "deployments_owner" ON public.deployments FOR ALL
      USING (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.user_id = auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='exports' AND policyname='exports_owner') THEN
    CREATE POLICY "exports_owner" ON public.exports FOR ALL
      USING (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.user_id = auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='provider_keys' AND policyname='provider_keys_owner') THEN
    CREATE POLICY "provider_keys_owner" ON public.provider_keys FOR ALL USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='provider_configs' AND policyname='provider_configs_owner') THEN
    CREATE POLICY "provider_configs_owner" ON public.provider_configs FOR ALL USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='model_preferences' AND policyname='model_prefs_owner') THEN
    CREATE POLICY "model_prefs_owner" ON public.model_preferences FOR ALL USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='github_connections' AND policyname='github_conn_owner') THEN
    CREATE POLICY "github_conn_owner" ON public.github_connections FOR ALL USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='cloudflare_connections' AND policyname='cf_conn_owner') THEN
    CREATE POLICY "cf_conn_owner" ON public.cloudflare_connections FOR ALL USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='audit_logs' AND policyname='audit_read_own') THEN
    CREATE POLICY "audit_read_own" ON public.audit_logs FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;

-- ── 003: Indexes ──────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_projects_user_id       ON public.projects (user_id);
CREATE INDEX IF NOT EXISTS idx_projects_status        ON public.projects (status);
CREATE INDEX IF NOT EXISTS idx_files_project_id       ON public.project_files (project_id);
CREATE INDEX IF NOT EXISTS idx_files_version_id       ON public.project_files (version_id);
CREATE INDEX IF NOT EXISTS idx_files_path             ON public.project_files (project_id, path) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_conversations_project  ON public.conversations (project_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation  ON public.messages (conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created       ON public.messages (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_runs_project           ON public.agent_runs (project_id);
CREATE INDEX IF NOT EXISTS idx_runs_status            ON public.agent_runs (status);
CREATE INDEX IF NOT EXISTS idx_tasks_run              ON public.tasks (run_id);
CREATE INDEX IF NOT EXISTS idx_tasks_project          ON public.tasks (project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status           ON public.tasks (status);
CREATE INDEX IF NOT EXISTS idx_deployments_project    ON public.deployments (project_id);
CREATE INDEX IF NOT EXISTS idx_audit_user             ON public.audit_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_audit_project          ON public.audit_logs (project_id);
CREATE INDEX IF NOT EXISTS idx_audit_created          ON public.audit_logs (created_at DESC);

-- ── 003: Updated_at triggers ──────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'users_updated_at') THEN
    CREATE TRIGGER users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'projects_updated_at') THEN
    CREATE TRIGGER projects_updated_at BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'project_files_updated_at') THEN
    CREATE TRIGGER project_files_updated_at BEFORE UPDATE ON public.project_files FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'conversations_updated_at') THEN
    CREATE TRIGGER conversations_updated_at BEFORE UPDATE ON public.conversations FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'provider_configs_updated_at') THEN
    CREATE TRIGGER provider_configs_updated_at BEFORE UPDATE ON public.provider_configs FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'github_connections_updated_at') THEN
    CREATE TRIGGER github_connections_updated_at BEFORE UPDATE ON public.github_connections FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'cloudflare_connections_updated_at') THEN
    CREATE TRIGGER cloudflare_connections_updated_at BEFORE UPDATE ON public.cloudflare_connections FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
  END IF;
END $$;

-- ── 004: handle_new_user trigger (CRITICAL — fixes projects FK) ───────
-- Auto-creates public.users row on auth signup. Without this, any
-- project INSERT fails with foreign key violation.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.users (id, email, display_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'display_name',
      NEW.raw_user_meta_data->>'name',
      split_part(NEW.email, '@', 1)
    ),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO UPDATE SET
    email        = EXCLUDED.email,
    display_name = COALESCE(EXCLUDED.display_name, public.users.display_name),
    avatar_url   = COALESCE(EXCLUDED.avatar_url,   public.users.avatar_url),
    updated_at   = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Backfill existing auth users who have no public.users row
INSERT INTO public.users (id, email, display_name, avatar_url)
SELECT
  au.id,
  au.email,
  COALESCE(
    au.raw_user_meta_data->>'full_name',
    au.raw_user_meta_data->>'display_name',
    split_part(au.email, '@', 1)
  ),
  au.raw_user_meta_data->>'avatar_url'
FROM auth.users au
LEFT JOIN public.users pu ON pu.id = au.id
WHERE pu.id IS NULL
ON CONFLICT (id) DO NOTHING;
