-- ── 005: Fix project_files for agent file writing ─────────────────────────
-- Adds run_id + description columns missing from initial schema.
-- Adds a partial unique index on (project_id, path) WHERE version_id IS NULL
-- so agents can upsert without specifying version_id.

-- Add missing columns (idempotent)
ALTER TABLE public.project_files
  ADD COLUMN IF NOT EXISTS run_id    UUID REFERENCES public.agent_runs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS description TEXT;

-- Add index for run_id lookups
CREATE INDEX IF NOT EXISTS idx_files_run_id ON public.project_files (run_id);

-- The existing UNIQUE(project_id, path, version_id) covers versioned files.
-- For agent writes (version_id IS NULL) we need a separate unique constraint
-- so onConflict("project_id,path") works correctly.
-- Drop the old constraint and recreate as a partial unique index.
-- NOTE: The old constraint stays — we add a new partial one for NULL version_id.
CREATE UNIQUE INDEX IF NOT EXISTS idx_files_project_path_no_version
  ON public.project_files (project_id, path)
  WHERE version_id IS NULL;
