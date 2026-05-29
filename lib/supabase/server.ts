import { createServerClient as createSSRClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Creates a Supabase server client using Next.js 15/16 async cookies() API.
 * Uses getAll/setAll cookie pattern required by @supabase/ssr >=0.6.
 * Must be called inside a Server Component, Route Handler, or Server Action.
 */
export async function createServerClient() {
  const cookieStore = await cookies();

  return createSSRClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // set() throws in read-only contexts (Server Components).
            // Safe to ignore — session refreshes on the next request.
          }
        },
      },
    }
  );
}
