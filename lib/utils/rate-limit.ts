/**
 * Rate limiting — sliding window, in-memory.
 * Drop-in replaceable with Upstash Redis by swapping the store implementation.
 *
 * Usage:
 *   const allowed = await checkRateLimit(userId, "generate", 5, "1m");
 *   if (!allowed) return new Response("Too Many Requests", { status: 429 });
 */

interface WindowEntry {
  timestamps: number[];
}

const store = new Map<string, WindowEntry>();

function parseWindow(window: string): number {
  const match = window.match(/^(\d+)(s|m|h|d)$/);
  if (!match) throw new Error(`Invalid window format: ${window}`);
  const value = parseInt(match[1], 10);
  const unit = match[2];
  const multipliers: Record<string, number> = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };
  return value * multipliers[unit];
}

/**
 * Returns true if the request is allowed, false if rate limited.
 * @param userId   Unique identifier for the subject (user ID, IP, etc.)
 * @param action   Action name (e.g. "generate", "chat", "deploy")
 * @param limit    Max requests allowed in the window
 * @param window   Time window string: "30s", "1m", "5m", "1h", "1d"
 */
export async function checkRateLimit(
  userId: string,
  action: string,
  limit: number,
  window: string
): Promise<boolean> {
  const key = `${userId}:${action}`;
  const windowMs = parseWindow(window);
  const now = Date.now();
  const cutoff = now - windowMs;

  const entry = store.get(key) ?? { timestamps: [] };
  // Evict expired timestamps
  entry.timestamps = entry.timestamps.filter((t) => t > cutoff);

  if (entry.timestamps.length >= limit) {
    store.set(key, entry);
    return false; // rate limited
  }

  entry.timestamps.push(now);
  store.set(key, entry);

  // Cleanup old keys every ~1000 calls to avoid memory leak
  if (Math.random() < 0.001) {
    for (const [k, v] of store.entries()) {
      if (v.timestamps.every((t) => t <= cutoff)) store.delete(k);
    }
  }

  return true;
}
