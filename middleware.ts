import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

const PUBLIC_PATHS = ["/landing", "/login", "/signup", "/api/auth", "/api/providers/test"];

// Rate-limit config per action
const RATE_LIMITS: Array<{ pattern: RegExp; action: string; limit: number; window: string }> = [
  { pattern: /^\/api\/projects\/[^/]+\/generate$/, action: "generate",   limit: 10, window: "1m" },
  { pattern: /^\/api\/projects\/[^/]+\/repair$/,   action: "repair",     limit: 20, window: "1m" },
  { pattern: /^\/api\/projects$/,                  action: "create_project", limit: 20, window: "1h" },
];

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return req.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            req.cookies.set(name, value);
            res.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const { pathname } = req.nextUrl;

  // Auth gate
  const isPublic = PUBLIC_PATHS.some(p => pathname.startsWith(p)) || pathname === "/";
  if (!isPublic && !user) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Rate limiting for authenticated API routes
  if (user && pathname.startsWith("/api/")) {
    const rule = RATE_LIMITS.find(r => r.pattern.test(pathname));
    if (rule) {
      try {
        // Dynamic import keeps the DB client out of the edge cold-path for non-rate-limited routes
        const { checkRateLimit } = await import("@/lib/utils/rate-limit");
        const allowed = await checkRateLimit(user.id, rule.action, rule.limit, rule.window);
        if (!allowed) {
          return NextResponse.json(
            { error: `Rate limit exceeded. Max ${rule.limit} ${rule.action} requests per ${rule.window}.` },
            { status: 429, headers: { "Retry-After": "60" } }
          );
        }
      } catch (err) {
        // Fail open — don't block users on rate-limit infra errors
        console.error("[middleware] rate-limit error:", err);
      }
    }
  }

  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|public).*)"],
};
