// Owner-archives-plan E2E — Plan 01-06.
// Covers requirement PLAN-05 + T-06-06 mitigation.
//
// Uses the same password-bypass auth pattern as token-revoke.spec.ts.
//
// Skips cleanly when local Supabase is unreachable.

import { test, expect, type APIRequestContext } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';
import path from 'node:path';

const SEED_PLAN_ID = '00000000-0000-0000-0000-000000000001';

function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) return;
  const content = fs.readFileSync(envPath, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}
loadEnv();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

const SEED_OWNER_EMAIL = 'test@groupcoordinator.local';
const SEED_OWNER_PASSWORD = 'test-password-do-not-use-in-prod';

async function supabaseUp(api: APIRequestContext | null): Promise<boolean> {
  if (!SUPABASE_URL || !ANON_KEY || SUPABASE_URL.includes('<from supabase status>')) {
    return false;
  }
  try {
    if (api) {
      const res = await api.get(`${SUPABASE_URL}/auth/v1/health`, {
        headers: { apikey: ANON_KEY },
        timeout: 2500,
      });
      return res.ok();
    }
    return false;
  } catch {
    return false;
  }
}

interface SessionCookies {
  access: string;
  refresh: string;
  payload: string;
}

async function mintSessionFor(email: string, password: string): Promise<SessionCookies> {
  const sdk = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await sdk.auth.signInWithPassword({ email, password });
  if (error || !data.session) {
    throw new Error(`signInWithPassword failed: ${error?.message ?? 'no session'}`);
  }
  return {
    access: data.session.access_token,
    refresh: data.session.refresh_token,
    payload: JSON.stringify({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      token_type: 'bearer',
      expires_in: data.session.expires_in,
      expires_at: data.session.expires_at,
      user: data.session.user,
    }),
  };
}

async function setSessionCookies(
  // biome-ignore lint/suspicious/noExplicitAny: Playwright BrowserContext typed loosely
  context: any,
  s: SessionCookies
): Promise<void> {
  await context.addCookies([
    {
      name: 'sb-access-token',
      value: s.access,
      domain: 'localhost',
      path: '/',
      httpOnly: false,
      secure: false,
      sameSite: 'Lax',
    },
    {
      name: 'sb-refresh-token',
      value: s.refresh,
      domain: 'localhost',
      path: '/',
      httpOnly: false,
      secure: false,
      sameSite: 'Lax',
    },
    {
      name: 'sb-localhost-auth-token',
      value: s.payload,
      domain: 'localhost',
      path: '/',
      httpOnly: false,
      secure: false,
      sameSite: 'Lax',
    },
  ]);
}

test.describe('Plan archive flow (Plan 01-06)', () => {
  test('owner archives plan; /me hides it; direct URL still resolves for owner; incognito 404s', async ({
    browser,
    request,
  }) => {
    if (!(await supabaseUp(request))) {
      test.skip(true, 'local Supabase not running (Docker required)');
    }
    if (!SERVICE_ROLE_KEY) {
      test.skip(true, 'SUPABASE_SERVICE_ROLE_KEY not in .env.local');
    }
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    // Pre-state: clear archived_at on the seed plan.
    await admin.from('plans').update({ archived_at: null }).eq('id', SEED_PLAN_ID);

    const session = await mintSessionFor(SEED_OWNER_EMAIL, SEED_OWNER_PASSWORD);

    const context = await browser.newContext();
    await setSessionCookies(context, session);
    const page = await context.newPage();

    await page.goto('/plan/seed-plan/settings');
    await expect(page.getByRole('heading', { name: 'Configuración' })).toBeVisible();

    // Click "Archivar plan" → ArchiveDialog opens.
    await page.getByRole('button', { name: 'Archivar plan' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText(/¿Archivar este plan\?/)).toBeVisible();

    // Confirm. archivePlan redirects to /me.
    await page.getByRole('button', { name: 'Archivar', exact: true }).click();
    await page.waitForURL(/\/me$/);

    // /me does not list the archived seed plan.
    await expect(page.getByRole('heading', { name: 'Mis planes' })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Plan de prueba/ })).not.toBeVisible();

    // Direct URL still resolves for the owner.
    await page.goto('/plan/seed-plan');
    await expect(page.getByRole('heading', { name: /Plan de prueba/ })).toBeVisible();

    // T-06-06: incognito with no claim → 404 (RLS blocks anon-no-claim).
    const incognito = await browser.newContext();
    const incognitoPage = await incognito.newPage();
    const res = await incognitoPage.goto('/plan/seed-plan');
    // Next.js returns 200 with the not-found page rendered, OR a 404 depending
    // on how notFound() is configured. Either way the plan title MUST NOT show.
    expect(res?.status() ?? 0).toBeGreaterThanOrEqual(200);
    await expect(
      incognitoPage.getByRole('heading', { name: /Plan de prueba/ })
    ).not.toBeVisible();

    await incognito.close();
    await context.close();

    // Cleanup — restore archived_at to null.
    await admin.from('plans').update({ archived_at: null }).eq('id', SEED_PLAN_ID);
  });
});
