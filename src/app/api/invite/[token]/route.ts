// Invite-link handler — the entry point for /i/[token] and the D-01 fallback
// /plan/[slug]?t=[token] (the latter is rewritten to here by src/middleware.ts).
//
// CONTRACT (RESEARCH §Area 1 + Pitfalls 1+2):
//   1. Rate-limit by client IP via in-memory token bucket (HP-6, D-22).
//   2. Validate token format (22 chars from no-lookalike alphabet).
//   3. Look up the invite via service-role (anon role cannot SELECT invite_tokens).
//   4. 302 to /errors/{token-invalid|token-revoked|token-expired} for failures.
//   5. Build the redirect response FIRST so @supabase/ssr can write Set-Cookie
//      onto it (Pitfall 2).
//   6. signInAnonymously() via server client → updateUserById via service-role
//      to set app_metadata.plan_id + invite_token_id (the Custom Access Token
//      Hook reads from app_metadata, never user_metadata) → refreshSession()
//      so the next JWT carries the top-level plan_id claim (Pitfall 1).
//   7. Atomically increment use_count (Drizzle `sql` template — race-safe).
//   8. Honor a `?next=` query param (D-01 fallback flow) when present, else
//      redirect to /plan/[slug-from-token-row].
//
// Threat surface mitigated here: T-03-01 (rate limit), T-03-02 (app_metadata
// not user-editable), T-03-06 (cookie set before redirect), T-03-07 (RLS gate).
// T-03-XX use_count race is now mitigated by the atomic SQL update — no longer
// 'accept' as the original threat register suggested.

import { db } from '@/../drizzle/db';
import { inviteTokens } from '@/../drizzle/schema';
import { rateLimitOrAllow } from '@/lib/auth/rate-limit';
import { type CookieOptions, createServerClient as createSsrServerClient } from '@supabase/ssr';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { eq, sql } from 'drizzle-orm';
import { type NextRequest, NextResponse } from 'next/server';

// Token alphabet — must match src/lib/auth/invite-token.ts. We re-declare here
// rather than import to keep the handler self-contained for static analysis.
const TOKEN_LENGTH = 22;
const TOKEN_ALPHABET_REGEX = /^[23456789abcdefghjkmnpqrstuvwxyz]{22}$/;

interface InviteLookup {
  id: string;
  plan_id: string;
  role: string;
  revoked_at: string | null;
  expires_at: string | null;
  use_count: number;
  plans: { slug: string };
}

function extractIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }
  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp.trim();
  return 'unknown';
}

function redirectTo(
  request: NextRequest,
  path: string,
  extraHeaders?: Record<string, string>
): NextResponse {
  const response = NextResponse.redirect(new URL(path, request.url));
  if (extraHeaders) {
    for (const [key, value] of Object.entries(extraHeaders)) {
      response.headers.set(key, value);
    }
  }
  return response;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
): Promise<NextResponse> {
  const { token } = await params;

  // 1. Rate limit first — keeps service-role calls off the hot path.
  const ip = extractIp(request);
  const rl = rateLimitOrAllow(ip);
  if (!rl.allowed) {
    return redirectTo(request, '/errors/token-invalid', {
      'Retry-After': Math.ceil(rl.retryAfterMs / 1000).toString(),
    });
  }

  // 2. Format guard — cheaper than a DB hit and structural protection vs.
  //    enumeration attempts that bypass the rate limiter.
  if (token.length !== TOKEN_LENGTH || !TOKEN_ALPHABET_REGEX.test(token)) {
    return redirectTo(request, '/errors/token-invalid');
  }

  // 3. Service-role lookup. Anon role has no SELECT on invite_tokens (T-02-02).
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !serviceRoleKey || !anonKey) {
    return redirectTo(request, '/errors/server-error');
  }

  const admin = createAdminClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  const lookup = await admin
    .from('invite_tokens')
    .select('id, plan_id, role, revoked_at, expires_at, use_count, plans!inner(slug)')
    .eq('token', token)
    .maybeSingle();

  if (lookup.error || !lookup.data) {
    return redirectTo(request, '/errors/token-invalid');
  }
  const invite = lookup.data as unknown as InviteLookup;

  if (invite.revoked_at) {
    return redirectTo(request, '/errors/token-revoked');
  }
  if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
    return redirectTo(request, '/errors/token-expired');
  }

  // 4. Resolve the target URL. D-01 fallback: when ?next= is present (set by
  //    the middleware rewrite of /plan/[slug]?t=[token]), prefer it. Restrict
  //    to in-app paths starting with /plan/ to avoid open-redirect.
  const nextParam = request.nextUrl.searchParams.get('next');
  const candidate = nextParam?.startsWith('/plan/') ? nextParam : `/plan/${invite.plans.slug}`;

  // 5. Build the response BEFORE Supabase client creation so @supabase/ssr's
  //    setAll can mutate response.cookies as part of signInAnonymously +
  //    refreshSession. This is the structural defense against Pitfall 2
  //    (cookie not set before redirect).
  const response = NextResponse.redirect(new URL(candidate, request.url));

  const supabase = createSsrServerClient(supabaseUrl, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll().map(({ name, value }) => ({
          name,
          value,
        }));
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

  const { data: anonData, error: anonErr } = await supabase.auth.signInAnonymously();
  if (anonErr || !anonData?.user) {
    return redirectTo(request, '/errors/server-error');
  }

  // 6. Pin app_metadata.plan_id via service-role. The Custom Access Token Hook
  //    (Plan 01-02 supabase/migrations/001_auth_hook.sql) reads from
  //    claims.app_metadata.plan_id and promotes it to a top-level claim.
  const { error: metaErr } = await admin.auth.admin.updateUserById(anonData.user.id, {
    app_metadata: {
      plan_id: invite.plan_id,
      invite_token_id: invite.id,
    },
  });
  if (metaErr) {
    return redirectTo(request, '/errors/server-error');
  }

  // 7. Force a new token so the hook injects the plan_id claim (Pitfall 1).
  const { error: refreshErr } = await supabase.auth.refreshSession();
  if (refreshErr) {
    return redirectTo(request, '/errors/server-error');
  }

  // 8. Atomic use_count increment — race-safe under concurrent opens.
  //    Drizzle's sql template emits a single UPDATE ... SET use_count =
  //    use_count + 1 statement.
  try {
    await db
      .update(inviteTokens)
      .set({ useCount: sql`${inviteTokens.useCount} + 1` })
      .where(eq(inviteTokens.id, invite.id));
  } catch {
    // Logging the failure is appropriate but we do NOT block the redirect on
    // a use_count update — analytics is not security-critical for this path.
  }

  return response;
}
