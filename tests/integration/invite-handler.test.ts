// Invite handler integration tests — exercise the GET handler directly via
// constructed NextRequest objects. Skips cleanly when local Supabase is not
// reachable (matches the deferred-environment posture from Plans 01-01 / 01-02).
//
// Asserts:
//  - Valid seed token → 302 to /plan/seed-plan with sb-* Set-Cookie present
//  - Revoked token → 302 /errors/token-revoked
//  - Expired token → 302 /errors/token-expired
//  - Unknown but well-formed token → 302 /errors/token-invalid
//  - Malformed token (contains '!') → 302 /errors/token-invalid
//  - D-01 fallback (?next= param) → 302 to provided slug path
//  - Rate limit: 12 sequential calls from same IP — last calls carry
//    Retry-After header
//
// Note: NextRequest is exported from next/server but constructing it in a unit
// context requires the global Request — Node 20+ ships it natively.

import { NextRequest } from 'next/server';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { getSkipReason } from './_helpers';

let skipReason: string | null = null;

beforeAll(async () => {
  skipReason = await getSkipReason();
});

afterEach(async () => {
  // Reset rate-limit bucket between tests so they are independent.
  const mod = await import('@/lib/auth/rate-limit');
  mod._resetRateLimit();
});

async function callHandler(
  path: string,
  init?: { headers?: Record<string, string> },
): Promise<Response> {
  const { GET } = await import('@/app/api/invite/[token]/route');
  const url = new URL(path, 'http://localhost:3000');
  const headers = new Headers(init?.headers);
  const req = new NextRequest(url, { headers });
  // The token segment in the URL is the last path part.
  const segments = url.pathname.split('/').filter(Boolean);
  const token = segments[segments.length - 1] ?? '';
  return GET(req, { params: Promise.resolve({ token }) });
}

const VALID_TOKEN = 'seedvakjdtpken22charsx';
const REVOKED_TOKEN = 'seedrevpkedtpken22char';
const EXPIRED_TOKEN = 'seedexpjredtpken22cha2';
const UNKNOWN_TOKEN = 'aaaaaaaaaaaaaaaaaaaaaa';
const MALFORMED_TOKEN = 'aaaaaaaa!aaaaaaaaaaaaa';

describe('invite handler — GET /api/invite/[token]', () => {
  it('valid seed token → 302 to /plan/seed-plan with Set-Cookie', async () => {
    if (skipReason) {
      console.warn(`SKIP: ${skipReason}`);
      return;
    }
    const res = await callHandler(`/api/invite/${VALID_TOKEN}`);
    expect(res.status).toBe(307);
    const location = res.headers.get('Location') ?? '';
    expect(location).toMatch(/\/plan\/seed-plan$/);
    // @supabase/ssr writes Set-Cookie via response.cookies. Each cookie becomes
    // its own Set-Cookie header; collect them all from getSetCookie().
    const cookieHeaders =
      (res.headers as Headers & {
        getSetCookie?: () => string[];
      }).getSetCookie?.() ?? [];
    const hasSbCookie = cookieHeaders.some((c) => c.startsWith('sb-'));
    expect(hasSbCookie).toBe(true);
  });

  it('revoked token → 302 to /errors/token-revoked', async () => {
    if (skipReason) return;
    const res = await callHandler(`/api/invite/${REVOKED_TOKEN}`);
    expect(res.status).toBe(307);
    expect(res.headers.get('Location') ?? '').toMatch(/\/errors\/token-revoked/);
  });

  it('expired token → 302 to /errors/token-expired', async () => {
    if (skipReason) return;
    const res = await callHandler(`/api/invite/${EXPIRED_TOKEN}`);
    expect(res.status).toBe(307);
    expect(res.headers.get('Location') ?? '').toMatch(/\/errors\/token-expired/);
  });

  it('unknown well-formed token → 302 to /errors/token-invalid', async () => {
    if (skipReason) return;
    const res = await callHandler(`/api/invite/${UNKNOWN_TOKEN}`);
    expect(res.status).toBe(307);
    expect(res.headers.get('Location') ?? '').toMatch(/\/errors\/token-invalid/);
  });

  it('malformed token (contains "!") → 302 to /errors/token-invalid', async () => {
    // Format guard is environment-independent — runs even when Supabase is down.
    const res = await callHandler(`/api/invite/${MALFORMED_TOKEN}`);
    expect(res.status).toBe(307);
    expect(res.headers.get('Location') ?? '').toMatch(/\/errors\/token-invalid/);
  });

  it('rate limit: 12 sequential calls from same IP eventually emit Retry-After', async () => {
    // Format guard fires first for unknown tokens, so the rate-limit hit
    // happens against the same path. We use a well-formed but non-existent
    // token to keep the format guard out of the way and rely on rate-limit
    // returning a Retry-After.
    const headers = { 'x-forwarded-for': '10.0.0.1' };
    let sawRetryAfter = false;
    for (let i = 0; i < 12; i++) {
      const res = await callHandler(`/api/invite/${UNKNOWN_TOKEN}`, {
        headers,
      });
      expect(res.status).toBe(307);
      if (res.headers.get('Retry-After')) sawRetryAfter = true;
    }
    expect(sawRetryAfter).toBe(true);
  });

  it('D-01 fallback: ?next=/plan/seed-plan redirects to that slug', async () => {
    if (skipReason) return;
    const res = await callHandler(
      `/api/invite/${VALID_TOKEN}?next=/plan/seed-plan`,
    );
    expect(res.status).toBe(307);
    expect(res.headers.get('Location') ?? '').toMatch(/\/plan\/seed-plan$/);
  });

  it('?next= with non-/plan path is ignored (open-redirect guard)', async () => {
    if (skipReason) return;
    const res = await callHandler(
      `/api/invite/${VALID_TOKEN}?next=https://evil.example/`,
    );
    expect(res.status).toBe(307);
    // Should fall back to the slug from the token row.
    expect(res.headers.get('Location') ?? '').toMatch(/\/plan\/seed-plan$/);
  });
});
