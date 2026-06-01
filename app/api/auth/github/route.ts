import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

/**
 * Initiates GitHub OAuth via Supabase.
 * GET /api/auth/github → redirects to GitHub OAuth consent screen.
 * After consent, GitHub redirects to /auth/callback which exchanges the code.
 */
export async function GET(req: NextRequest) {
  const supabase = await createServerClient();
  const origin   = req.nextUrl.origin;

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "github",
    options: {
      redirectTo: `${origin}/auth/callback?next=/dashboard`,
      scopes: "read:user user:email",
    },
  });

  if (error || !data.url) {
    return NextResponse.redirect(`${origin}/login?error=oauth_failed`);
  }

  return NextResponse.redirect(data.url);
}
