import { NextRequest } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function requireAuth(_req: NextRequest) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}
