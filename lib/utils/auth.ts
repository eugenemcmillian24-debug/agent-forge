import { NextRequest } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
export async function requireAuth(req: NextRequest) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}
