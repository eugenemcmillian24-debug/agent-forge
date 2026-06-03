/**
 * Tests for the in-memory edge rate limiter (lib/rate-limit.ts)
 *
 * The Supabase-backed limiter (lib/utils/rate-limit.ts) requires a DB
 * connection so we test it via integration contract only.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { rateLimit, pruneExpired } from "@/lib/rate-limit";

describe("In-memory edge rate limiter", () => {
  beforeEach(() => {
    // Prune any state from previous tests
    pruneExpired();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows the first request", () => {
    const result = rateLimit("test:user1", { limit: 5, windowMs: 60_000 });
    expect(result.success).toBe(true);
    expect(result.remaining).toBe(4);
  });

  it("tracks remaining count correctly", () => {
    for (let i = 0; i < 3; i++) {
      rateLimit("test:user2", { limit: 5, windowMs: 60_000 });
    }
    const result = rateLimit("test:user2", { limit: 5, windowMs: 60_000 });
    expect(result.remaining).toBe(1);
  });

  it("blocks when limit is reached", () => {
    for (let i = 0; i < 5; i++) {
      rateLimit("test:user3", { limit: 5, windowMs: 60_000 });
    }
    const result = rateLimit("test:user3", { limit: 5, windowMs: 60_000 });
    expect(result.success).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it("resets after window expires", () => {
    for (let i = 0; i < 5; i++) {
      rateLimit("test:user4", { limit: 5, windowMs: 60_000 });
    }
    expect(rateLimit("test:user4", { limit: 5, windowMs: 60_000 }).success).toBe(false);

    // Advance past the window
    vi.advanceTimersByTime(61_000);

    const result = rateLimit("test:user4", { limit: 5, windowMs: 60_000 });
    expect(result.success).toBe(true);
    expect(result.remaining).toBe(4);
  });

  it("isolates counters per key", () => {
    for (let i = 0; i < 5; i++) {
      rateLimit("test:userA", { limit: 5, windowMs: 60_000 });
    }
    // userB is unaffected
    const result = rateLimit("test:userB", { limit: 5, windowMs: 60_000 });
    expect(result.success).toBe(true);
    expect(result.remaining).toBe(4);
  });

  it("returns a resetAt timestamp in the future", () => {
    const now = Date.now();
    const result = rateLimit("test:user5", { limit: 5, windowMs: 60_000 });
    expect(result.resetAt).toBeGreaterThan(now);
    expect(result.resetAt).toBeLessThanOrEqual(now + 60_000 + 100);
  });

  it("handles limit of 1 correctly", () => {
    const first  = rateLimit("test:strict", { limit: 1, windowMs: 60_000 });
    const second = rateLimit("test:strict", { limit: 1, windowMs: 60_000 });
    expect(first.success).toBe(true);
    expect(second.success).toBe(false);
  });

  it("pruneExpired removes stale entries without affecting active ones", () => {
    rateLimit("test:stale",  { limit: 5, windowMs: 1_000 });
    rateLimit("test:active", { limit: 5, windowMs: 60_000 });

    vi.advanceTimersByTime(2_000);
    pruneExpired();

    // Active key still works with its original window
    const result = rateLimit("test:active", { limit: 5, windowMs: 60_000 });
    expect(result.success).toBe(true);
    expect(result.remaining).toBe(3); // 2 used + this one
  });
});

describe("Rate limit window edge cases", () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it("exactly at window boundary resets correctly", () => {
    rateLimit("test:boundary", { limit: 2, windowMs: 1_000 });
    rateLimit("test:boundary", { limit: 2, windowMs: 1_000 });
    expect(rateLimit("test:boundary", { limit: 2, windowMs: 1_000 }).success).toBe(false);

    vi.advanceTimersByTime(1_001);
    expect(rateLimit("test:boundary", { limit: 2, windowMs: 1_000 }).success).toBe(true);
  });

  it("generate endpoint limit (10/min) blocks on 11th request", () => {
    const GEN_LIMIT  = 10;
    const GEN_WINDOW = 60_000;
    for (let i = 0; i < GEN_LIMIT; i++) {
      expect(rateLimit("gen:ip1", { limit: GEN_LIMIT, windowMs: GEN_WINDOW }).success).toBe(true);
    }
    expect(rateLimit("gen:ip1", { limit: GEN_LIMIT, windowMs: GEN_WINDOW }).success).toBe(false);
  });
});
