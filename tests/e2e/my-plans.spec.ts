// /me dashboard — Playwright E2E.
//
// Covers PLAN-06 (signed-in user sees all plans they belong to) and AUTH-05
// (session persists across refresh).
//
// Like the OAuth-upgrade spec, real Google OAuth cannot run from CI. We mint
// a session via Supabase Admin API password sign-in and write the auth
// cookies into the Playwright context so the SSR plan-fetch returns the
// seeded plan.
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
    const res = await fetch(`${SUPABASE_URL}/auth/v1/health`, {
      headers: { apikey: ANON_KEY },
      signal: AbortSignal.timeout(2500),
    });
    return res.ok;
  } catch {
    return false;
  }
}

interface SessionCookies {
  access: string;
  refresh: string;
  payload: string;
}

async function mintSessionFor(
  email: string,
  password: string
): Promise<SessionCookies> {
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

test.describe('/me dashboard (PLAN-06, AUTH-05)', () => {
  test('lists at least one plan for the seeded owner', async ({ browser, request }) => {
    if (!(await supabaseUp(request))) {
      test.skip(true, 'local Supabase not running (Docker required)');
    }
    const session = await mintSessionFor(SEED_OWNER_EMAIL, SEED_OWNER_PASSWORD);

    const context = await browser.newContext();
    await setSessionCookies(context, session);
    const page = await context.newPage();
    await page.goto('/me');

    await expect(page.getByRole('heading', { name: 'Mis planes' })).toBeVisible();
    // At least one plan should be present (seed plan owned by SEED_OWNER).
    await expect(
      page.getByRole('heading', { name: /Plan de prueba/ })
    ).toBeVisible();

    await context.close();
  });

  test('empty state shows for a user with no memberships', async ({ browser, request }) => {
    if (!(await supabaseUp(request))) {
      test.skip(true, 'local Supabase not running (Docker required)');
    }
    if (!SERVICE_ROLE_KEY) {
      test.skip(true, 'SUPABASE_SERVICE_ROLE_KEY not in .env.local');
    }
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const email = `me-empty-${Date.now()}@groupcoordinator.local`;
    const password = 'test-password-do-not-use-in-prod';
    const created = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (created.error || !created.data.user) {
      throw new Error(`createUser failed: ${created.error?.message}`);
    }
    const userId = created.data.user.id;

    try {
      const session = await mintSessionFor(email, password);
      const context = await browser.newContext();
      await setSessionCookies(context, session);
      const page = await context.newPage();
      await page.goto('/me');

      // Empty state heading + Create-first CTA from es.json
      await expect(
        page.getByText('Todavía no tienes ningún plan.')
      ).toBeVisible();
      await expect(
        page.getByRole('link', { name: 'Crear mi primer plan' })
      ).toBeVisible();

      await context.close();
    } finally {
      await admin.auth.admin.deleteUser(userId);
    }
  });

  test('refresh keeps the session alive (AUTH-05)', async ({ browser, request }) => {
    if (!(await supabaseUp(request))) {
      test.skip(true, 'local Supabase not running (Docker required)');
    }
    const session = await mintSessionFor(SEED_OWNER_EMAIL, SEED_OWNER_PASSWORD);
    const context = await browser.newContext();
    await setSessionCookies(context, session);
    const page = await context.newPage();
    await page.goto('/me');
    await expect(page.getByRole('heading', { name: 'Mis planes' })).toBeVisible();
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Mis planes' })).toBeVisible();
    await context.close();
  });
});
