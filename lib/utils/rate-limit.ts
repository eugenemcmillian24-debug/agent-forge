/**
 * Rate limiting — Supabase-backed sliding window.
 *
 * Replaces the in-memory Map which resets per Cloudflare Worker isolate
 * and provides zero protection in production.
 *
 * Requires the rate_limit_events table (migration 002).
 */

import { createAdminClient } from "@/lib/supabase/admin";

function parseWindowMs(window: string): number {
  const match = window.match(/^(\d+)(s|m|h|d)$/);
  if (!match) throw new Error(`Invalid window format: ${window}`);
  const value = parseInt(match[1], 10);
  const unit = match[2];
  const multipliers: Record<string, number> = {
    s: 1_000,
    m: 60_000,
    h: 3_600_000,
    d: 86_400_000,
  };
  return value * multipliers[unit];
}

/**
 * Returns true if the request is allowed, false if rate limited.
 */
export async function checkRateLimit(
  userId: string,
  action: string,
  limit: number,
  window: string
): Promise<boolean> {
  const windowMs = parseWindowMs(window);
  const cutoff = new Date(Date.now() - windowMs).toISOString();
  const admin = createAdminClient();

  const { count, error: countError } = await admin
    .from("rate_limit_events")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("action", action)
    .gte("created_at", cutoff);

  if (countError) {
    // Fail open on DB error — don't block users due to infra issues
    console.error("[rate-limit] count error:", countError.message);
    return true;
  }

  if ((count ?? 0) >= limit) {
    return false;
  }

  // Record this event (fire-and-forget; don't block the response)
  admin
    .from("rate_limit_events")
    .insert({ user_id: userId, action })
    .then(({ error }) => {
      if (error) console.error("[rate-limit] insert error:", error.message);
    });

  return true;
}
