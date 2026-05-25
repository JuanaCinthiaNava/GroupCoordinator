// Supabase server client — for Server Components, Server Actions, Route Handlers.
//
// CONTRACT (RESEARCH §Area 5 step 10):
// - Uses @supabase/ssr's getAll/setAll cookie pattern (legacy get/set/remove is removed
//   in v0.5+).
// - Wrap setAll in try/catch because Server Components throw when you try to mutate
//   cookies during render. The middleware (src/middleware.ts) refreshes the session
//   on every navigation so the catch is only relevant for the first response.
// - The Anon Key (NEXT_PUBLIC_SUPABASE_ANON_KEY) is the public client identity;
//   RLS is the real gate. Service-role usage is in service-role.ts only.

import { type CookieOptions, createServerClient as createSsrServerClient } from '@supabase/ssr';
import type { ReadonlyRequestCookies } from 'next/dist/server/web/spec-extension/adapters/request-cookies';

export function createServerClient(cookieStore: ReadonlyRequestCookies) {
  return createSsrServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(
          cookiesToSet: Array<{
            name: string;
            value: string;
            options?: CookieOptions;
          }>
        ) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              // The cast widens to mutable cookie store — Next.js types are conservative
              // about Server Component cookie mutation, but middleware/route handlers
              // permit it.
              (
                cookieStore as unknown as {
                  set: (n: string, v: string, o?: CookieOptions) => void;
                }
              ).set(name, value, options);
            }
          } catch {
            // Server Component render context — middleware will set cookies on the
            // response in src/middleware.ts. Safe to swallow.
          }
        },
      },
    }
  );
}
