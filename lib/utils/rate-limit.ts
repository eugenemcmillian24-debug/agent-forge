import { createAdminClient } from "@/lib/supabase/admin";
export async function checkRateLimit(userId: string, action: string, limit: number, window: string): Promise<boolean> {
  // Simple in-memory rate limit stub — replace with Redis/Upstash in production
  // For now always allow (implement proper rate limiting based on your infra)
  return true;
}
