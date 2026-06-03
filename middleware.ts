import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

// ── IP-level burst protection (edge layer) ────────────────────────────────────
// This in-memory limiter runs at the Cloudflare Worker edge and resets on cold
// starts — it is intentionally lightweight burst protection only, not the
// authoritative rate limiter. Per-user rate limiting (sliding window, Supabase-
// backed, persistent across restarts) is enforced inside each API route handler
// via lib/utils/rate-limit.ts checkRateLimit(). Do not remove the per-route
// checks in favour of this one.

interface Window { count: number; resetAt: number; }
const store = new Map<string, Window>();

function edgeRateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const existing = store.get(key);
  if (!existing || now > existing.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { success: true, remaining: limit - 1, resetAt: now + windowMs };
  }
  if (existing.count >= limit) {
    return { success: false, remaining: 0, resetAt: existing.resetAt };
  }
  existing.count += 1;
  return { success: true, remaining: limit - existing.count, resetAt: existing.resetAt };
}

// 120 requests per minute per IP on all API routes
const API_LIMIT  = 120;
const API_WINDOW = 60_000;

// Tighter burst cap on generate (AI calls are expensive)
const GEN_LIMIT  = 5;
const GEN_WINDOW = 60_000;

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const { pathname } = req.nextUrl;

  // ── Edge burst rate limiting ──────────────────────────────────────────────
  if (pathname.startsWith("/api/")) {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
    const isGenerate = pathname.includes("/generate") || pathname.includes("/partial-regen");

    const result = isGenerate
      ? edgeRateLimit(`gen:${ip}`, GEN_LIMIT,  GEN_WINDOW)
      : edgeRateLimit(`api:${ip}`, API_LIMIT,  API_WINDOW);

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

  const publicPaths = ["/landing", "/login", "/signup", "/api/auth", "/share"];
  const isPublic =
    publicPaths.some(p => pathname.startsWith(p)) || pathname === "/";

  if (!isPublic && !user) {
    if (pathname.startsWith("/api/")) {
      return new NextResponse(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|public).*)"],
};
