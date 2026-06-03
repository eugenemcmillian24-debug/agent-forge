import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = await createServerClient();
  await supabase.auth.signOut();
  // Derive base URL from the request origin — no env var needed
  const origin = req.headers.get("origin") ?? new URL(req.url).origin;
  return NextResponse.redirect(new URL("/login", origin));
}
