// SERVER-ONLY. NEVER IMPORT FROM CLIENT COMPONENTS.
// RLS bypass — used only in /api/invite/[token], /auth/callback, migrations, seed scripts.
//
// Anti-Pattern 1 (security_threat_model T-02-05): importing this into a Client
// Component leaks the service-role key into the browser bundle. The runtime
// `if (typeof window !== 'undefined')` guard below trips immediately if that
// ever happens during build/preview, so the leak is caught before it ships.
//
// Companion lint hint: this file deliberately has no 'use client' directive
// and no JSX. It exports a single factory.

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

if (typeof window !== 'undefined') {
  throw new Error(
    'service-role client must not be imported in browser bundles. ' +
      'See src/lib/supabase/service-role.ts top comment for the contract.',
  );
}

export function createServiceRoleClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      'createServiceRoleClient: missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY',
    );
  }
  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
