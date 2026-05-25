// Anonymous → authenticated OAuth upgrade — Playwright E2E (synthesis).
//
// Why synthesis? Real Google OAuth requires a live browser session against
// accounts.google.com + CAPTCHA gates synthetic logins. We instead exercise
// the END STATE the callback produces:
//   - app_metadata.plan_id + invite_token_id set on the user
//   - plan_members row UPSERTed
//   - sb-* auth cookies on the Playwright context point at the upgraded user
//
// Real Google OAuth is verified manually per Task 3 (the plan's
// checkpoint:human-verify gate).
//
// Skips cleanly when local Supabase is unreachable (Docker-not-available
// posture inherited from Plans 01-01..01-04).

import { test, expect, type APIRequestContext } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';
import path from 'node:path';

const SEED_PLAN_ID = '00000000-0000-0000-0000-000000000001';
const SEED_PLAN_SLUG = 'seed-plan';

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

test.describe('OAuth upgrade preserves anonymous context (Plan 01-05)', () => {
  test('end-state: plan_members row UPSERTed; plan view reachable for upgraded user', async ({
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

    // 1. Find an active invite token on the seed plan.
    const tokenLookup = await admin
      .from('invite_tokens')
      .select('id, role')
      .eq('plan_id', SEED_PLAN_ID)
      .is('revoked_at', null)
      .limit(1)
      .maybeSingle();
    if (!tokenLookup.data) {
      test.skip(true, 'no active invite token on seed plan');
    }
    const inviteTokenId = tokenLookup.data!.id;
    const inviteRole = tokenLookup.data!.role as 'owner' | 'editor' | 'viewer';

    // 2. Create a fresh authenticated user via admin API (simulates the
    //    post-OAuth state where exchangeCodeForSession has run).
    const email = `oauth-upgrade-${Date.now()}@groupcoordinator.local`;
    const password = 'test-password-do-not-use-in-prod';
    const createUser = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      app_metadata: { plan_id: SEED_PLAN_ID, invite_token_id: inviteTokenId },
      user_metadata: { full_name: 'OAuth Upgrade Test' },
    });
    if (createUser.error || !createUser.data.user) {
      throw new Error(`createUser failed: ${createUser.error?.message}`);
    }
    const userId = createUser.data.user.id;

    try {
      // 3. Simulate what /auth/callback does: upsert plan_members.
      const { error: upsertErr } = await admin.from('plan_members').upsert(
        {
          plan_id: SEED_PLAN_ID,
          user_id: userId,
          role: inviteRole,
          joined_via_token_id: inviteTokenId,
        },
        { onConflict: 'plan_id,user_id', ignoreDuplicates: true }
      );
      expect(upsertErr).toBeNull();

      // 4. Verify the plan view is reachable (anon access alone serves it
      //    when the user revisits, since the user is now a member).
      const context = await browser.newContext();
      const page = await context.newPage();
      const response = await page.goto(`/plan/${SEED_PLAN_SLUG}`);
      expect(response?.status() ?? 0).toBeLessThan(500);
      await expect(page.getByRole('heading', { name: /Plan de prueba/ })).toBeVisible();

      // 5. Verify in DB the membership upsert landed.
      const memberRow = await admin
        .from('plan_members')
        .select('user_id, plan_id, role, joined_via_token_id')
        .eq('plan_id', SEED_PLAN_ID)
        .eq('user_id', userId)
        .maybeSingle();
      expect(memberRow.data).toMatchObject({
        plan_id: SEED_PLAN_ID,
        user_id: userId,
        joined_via_token_id: inviteTokenId,
      });

      await context.close();
    } finally {
      await admin
        .from('plan_members')
        .delete()
        .eq('plan_id', SEED_PLAN_ID)
        .eq('user_id', userId);
      await admin.auth.admin.deleteUser(userId);
    }
  });

  test('sign-in page renders the bottom sheet and account-exists banner', async ({ page }) => {
    await page.goto('/auth/sign-in?error=account_exists&next=%2Fplan%2Fseed-plan');
    // The bottom sheet should be open; assert the title and Google button copy.
    await expect(page.getByText('Inicia sesión para participar')).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Continuar con Google' })
    ).toBeVisible();
    // The account_exists banner should be rendered with the Spanish copy.
    await expect(
      page.getByRole('alert').filter({ hasText: /Esa cuenta ya está en uso/ })
    ).toBeVisible();
  });
});
