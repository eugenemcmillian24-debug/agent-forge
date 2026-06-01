import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { rateLimit } from "@/lib/rate-limit";

// 60 requests per minute per IP on API routes
const API_LIMIT  = 60;
const API_WINDOW = 60_000;

// Stricter limit on generate endpoint (AI calls are expensive)
const GEN_LIMIT  = 10;
const GEN_WINDOW = 60_000;

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const { pathname } = req.nextUrl;

  // ── Rate limiting (API routes only) ──────────────────────────────────────
  if (pathname.startsWith("/api/")) {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
    const isGenerate = pathname.includes("/generate");

    const result = isGenerate
      ? rateLimit(`gen:${ip}`, { limit: GEN_LIMIT,  windowMs: GEN_WINDOW  })
      : rateLimit(`api:${ip}`, { limit: API_LIMIT,  windowMs: API_WINDOW  });

    if (!result.success) {
      return new NextResponse(
        JSON.stringify({
          error: "Too many requests",
          retryAfter: Math.ceil((result.resetAt - Date.now()) / 1000),
        }),
        {
          status: 429,
          headers: {
            "Content-Type":          "application/json",
            "X-RateLimit-Limit":     String(isGenerate ? GEN_LIMIT : API_LIMIT),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset":     String(result.resetAt),
            "Retry-After":           String(Math.ceil((result.resetAt - Date.now()) / 1000)),
          },
        }
      );
    }

    res.headers.set("X-RateLimit-Remaining", String(result.remaining));
    res.headers.set("X-RateLimit-Reset",     String(result.resetAt));
  }

  // ── Auth guard ────────────────────────────────────────────────────────────
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll()             { return req.cookies.getAll(); },
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

  const publicPaths = ["/landing", "/login", "/signup", "/api/auth"];
  const isPublic =
    publicPaths.some(p => pathname.startsWith(p)) || pathname === "/";

  if (!isPublic && !user) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|public).*)"],
};
