import { createServerClient as createSSRClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Creates a Supabase server client using Next.js 15's async cookies() API.
 * Must be called inside a Server Component, Route Handler, or Server Action.
 */
export async function createServerClient() {
  const cookieStore = await cookies();

  return createSSRClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: Record<string, unknown>) {
          try {
            cookieStore.set(name, value, options as Parameters<typeof cookieStore.set>[2]);
          } catch {
            // set() can throw in read-only contexts (e.g. Server Components).
            // Safe to ignore — the session will refresh on the next request.
          }
        },
        remove(name: string, options: Record<string, unknown>) {
          try {
            cookieStore.set(name, "", { ...options as Parameters<typeof cookieStore.set>[2], maxAge: 0 });
          } catch {
            // Same as above — safe to ignore.
          }
        },
      },
    }
  );
}
