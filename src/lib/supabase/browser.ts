// Supabase browser client — singleton for use inside Client Components.
//
// CONTRACT:
// - One instance per browser session. @supabase/ssr's createBrowserClient
//   reads the same cookies as the server client so they share a session.
// - Use ONLY in 'use client' files. Server contexts must import from
//   src/lib/supabase/server.ts (or service-role.ts for admin paths).

import { createBrowserClient } from '@supabase/ssr';

type BrowserClient = ReturnType<typeof createBrowserClient>;

let client: BrowserClient | null = null;

export function getBrowserClient(): BrowserClient {
  if (client) return client;
  client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
  );
  return client;
}
