// /api/og/[plan_slug] integration — invoke the GET handler with a constructed
// NextRequest and assert the PNG bytes are non-trivial, the cache headers are
// set, and the fallback path for nonexistent slugs also produces a real PNG.
//
// Skips DB-dependent assertions when Supabase isn't running. The fallback path
// test exercises the route entirely without a live plan and asserts the
// "Plan no disponible" PNG is still produced — that path is environment-
// independent (the service-role lookup is wrapped in try/catch).

import { NextRequest } from 'next/server';
import { beforeAll, describe, expect, it } from 'vitest';
import { getSkipReason } from './_helpers';

let skipReason: string | null = null;

beforeAll(async () => {
  skipReason = await getSkipReason();
});

async function callGet(plan_slug: string): Promise<Response> {
  const { GET } = await import('@/app/api/og/[plan_slug]/route');
  const url = new URL(`/api/og/${plan_slug}`, 'http://localhost:3000');
  const req = new NextRequest(url);
  return GET(req, { params: Promise.resolve({ plan_slug }) });
}

describe('OG image — GET /api/og/[plan_slug]', () => {
  it('valid seed plan slug → 200 image/png with Cache-Control and non-trivial body', async () => {
    if (skipReason) {
      console.warn(`SKIP: ${skipReason}`);
      return;
    }
    // Sanity-check loadGeistSans resolves before exercising the route — this
    // catches font-loader regressions early.
    const { loadGeistSans } = await import('@/lib/og/fonts');
    const fonts = await loadGeistSans();
    expect(fonts).toBeTruthy();

    const res = await callGet('seed-plan');
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type') ?? '').toMatch(/^image\/png/);
    const cc = res.headers.get('Cache-Control') ?? '';
    expect(cc).toMatch(/s-maxage/);

    const buf = await res.arrayBuffer();
    expect(buf.byteLength).toBeGreaterThan(50000);
  });

  it('nonexistent slug → 200 "Plan no disponible" PNG (still cacheable)', async () => {
    // Environment-independent — the route renders the fallback when the DB
    // lookup fails OR returns null. We use a slug that should never resolve.
    const res = await callGet('this-slug-does-not-exist-xyz123');
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type') ?? '').toMatch(/^image\/png/);
    const cc = res.headers.get('Cache-Control') ?? '';
    expect(cc).toMatch(/s-maxage/);
    const buf = await res.arrayBuffer();
    expect(buf.byteLength).toBeGreaterThan(50000);
  });
});
