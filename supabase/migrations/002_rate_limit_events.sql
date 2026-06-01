-- Migration: add rate_limit_events for Cloudflare Workers-compatible rate limiting
-- In-memory rate limiting does not work on Workers (isolates are stateless).

create table if not exists rate_limit_events (
  id         uuid primary key default gen_random_uuid(),
  user_id    text not null,
  action     text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_rate_limit_lookup
  on rate_limit_events (user_id, action, created_at desc);

-- Optional: schedule hourly cleanup via pg_cron
-- select cron.schedule('cleanup-rate-limits', '0 * * * *',
--   $$delete from rate_limit_events where created_at < now() - interval '24 hours'$$);

alter table rate_limit_events enable row level security;
-- Service role bypasses RLS — no policies needed for API routes
