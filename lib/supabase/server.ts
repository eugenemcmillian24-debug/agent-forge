import { createServerClient as createSSRClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export function createServerClient() {
  // In Next.js 15, cookies() returns a Promise — we use the sync API via get/set
  return createSSRClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const store = cookies() as any;
          return store.get?.(name)?.value ?? store.then?.((s: any) => s.get(name)?.value);
        },
        set() {},
        remove() {},
      },
    }
  );
}
