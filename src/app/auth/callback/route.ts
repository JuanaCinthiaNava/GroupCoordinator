// OAuth callback — completes anonymous → authenticated upgrade (D-11, AUTH-02, AUTH-04).
//
// Flow (RESEARCH §Area 2, verbatim):
//   1. Read ?code= and ?next= from the request URL.
//   2. Validate `next` is a safe relative path (T-05-01 — open-redirect guard).
//   3. Build the redirect response FIRST so @supabase/ssr's setAll can write
//      Set-Cookie onto it (Pitfall 2).
//   4. exchangeCodeForSession on the SSR server client wired to BOTH
//      request.cookies.getAll (reads the anonymous session cookie set by the
//      /api/invite/[token] handler) AND response.cookies.set (writes the new
//      authenticated cookie onto the redirect).
//   5. On `identity already exists` / `email_exists` errors → redirect to
//      /auth/sign-in?error=account_exists&next=… so the user can sign in with
//      their existing account and re-open the invite (RESEARCH §Area 2 +
//      Assumption A2).
//   6. Read app_metadata.plan_id + invite_token_id (set by /api/invite/[token]
//      before the OAuth round-trip). If present, look up the role from
//      invite_tokens via service-role and UPSERT plan_members
//      (onConflict 'plan_id,user_id', ignoreDuplicates: true) — relies on the
//      UNIQUE constraint added in Plan 01-02.
//   7. Return the redirect response.
//
// IMPORTANT (RESEARCH §Area 2 + Assumption A1): we do NOT call linkIdentity()
// explicitly. `exchangeCodeForSession` performs the link automatically when
// the SSR server client already holds the anonymous session cookie (set during
// /api/invite/[token]). The integration test exercises the post-exchange logic
// via the extracted helper.
//
// D-12: no pending-action replay. D-17: Google only (no magic-link handler here).

import { type CookieOptions, createServerClient as createSsrServerClient } from '@supabase/ssr';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { type NextRequest, NextResponse } from 'next/server';
import {
  type ParsedCallbackError,
  parseCallbackError,
  upsertPlanMembershipFromAppMeta,
} from './_helpers';

export { parseCallbackError, upsertPlanMembershipFromAppMeta };
export type { ParsedCallbackError };

/**
 * Validate that `next` is a safe relative in-app path. Per T-05-01, reject
 * absolute URLs (http://, https://, //), protocol-relative URLs, and any path
 * that does not start with a single '/'. Fallback to '/me' when unsafe.
 */
function safeNext(raw: string | null): string {
  if (!raw) return '/me';
  if (!raw.startsWith('/')) return '/me';
  // Protocol-relative ('//evil.example/...') — reject.
  if (raw.startsWith('//')) return '/me';
  // Embedded scheme — reject (e.g., '/http://evil' is fine but '/:javascript' isn't).
  if (raw.toLowerCase().startsWith('/javascript:')) return '/me';
  return raw;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = safeNext(searchParams.get('next'));

  if (!code) {
    return NextResponse.redirect(new URL('/errors/server-error', request.url));
  }

  // Build the redirect response BEFORE the Supabase client so setAll mutates
  // response.cookies — same pattern as /api/invite/[token] (Pitfall 2).
  const response = NextResponse.redirect(new URL(next, origin));

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return NextResponse.redirect(new URL('/errors/server-error', request.url));
  }

  const supabase = createSsrServerClient(supabaseUrl, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll().map(({ name, value }) => ({ name, value }));
      },
      setAll(
        cookiesToSet: Array<{
          name: string;
          value: string;
          options?: CookieOptions;
        }>
      ) {
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data?.user) {
    const parsed = parseCallbackError(error);
    if (parsed.kind === 'account_exists') {
      const params = new URLSearchParams({ error: 'account_exists', next });
      return NextResponse.redirect(new URL(`/auth/sign-in?${params}`, request.url));
    }
    return NextResponse.redirect(new URL('/errors/server-error', request.url));
  }

  // Per Assumption A1: exchangeCodeForSession preserves the anonymous user_id
  // automatically when the SSR client already holds the anon cookie. If
  // data.user.id differs from the anonymous user's id (which we cannot easily
  // verify here without an extra getUser() call against the prior cookie),
  // RLS will still grant access via the new authenticated user_id — but the
  // plan_members membership upsert below ensures the join completes.
  const userId = data.user.id;
  const appMeta = (data.user.app_metadata ?? {}) as {
    plan_id?: string;
    invite_token_id?: string;
  };

  if (appMeta.plan_id) {
    try {
      const admin = createAdminClient(supabaseUrl, serviceRoleKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      });
      await upsertPlanMembershipFromAppMeta(admin, userId, appMeta);
    } catch {
      // Best-effort: if the upsert fails (e.g., temporary DB hiccup), do NOT
      // block the redirect. The user is signed in and RLS will surface the
      // missing membership next time they hit the plan; the share-link
      // re-issue is recoverable.
    }
  }

  return response;
}
