import { NextRequest } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

/**
 * Works in both Route Handlers (pass req) and Server Components (no req).
 * The underlying createServerClient reads cookies() from Next.js context.
 */
export async function requireAuth(_req?: NextRequest) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}
