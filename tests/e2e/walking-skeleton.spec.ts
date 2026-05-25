// Walking Skeleton — Phase 1 E2E gate
//
// Owned now by: Plan 01-01 (marketing tagline) + Plan 01-03 (seed-plan view).
// Covers requirements: PLAN-01, PLAN-02, PLAN-03, AUTH-04
// Plan 01-04 will un-skip the create-plan → share-dialog → anonymous-view
// end-to-end test below.

import { expect, test } from '@playwright/test';

const VALID_TOKEN = 'seedvakjdtpken22charsx';

async function supabaseUp(): Promise<boolean> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
  if (!url || !anon || url.includes('<from supabase status>')) return false;
  try {
    const res = await fetch(`${url}/auth/v1/health`, {
      headers: { apikey: anon },
      signal: AbortSignal.timeout(2500),
    });
    return res.ok;
  } catch {
    return false;
  }
}

test('marketing landing renders the Spanish tagline', async ({ page }) => {
  await page.goto('/');
  // The /[locale] route with `localePrefix: 'as-needed'` serves Spanish at /.
  await expect(
    page.getByRole('heading', {
      name: 'Nunca más pierdas la reserva en el chat del grupo.',
    }),
  ).toBeVisible();
});

test('seed plan visible via /i/[token] end-to-end', async ({ browser }) => {
  if (!(await supabaseUp())) {
    test.skip(true, 'local Supabase not running');
  }
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(`/i/${VALID_TOKEN}`);
  await page.waitForURL(/\/plan\/seed-plan(\?.*)?$/);
  await expect(
    page.getByRole('heading', { name: /Plan de prueba/ }),
  ).toBeVisible();
  await context.close();
});

// TODO(Plan 01-04): unskip after createPlan Server Action + share dialog land.
test.skip('Walking Skeleton: create plan and view invite link end-to-end', async () => {
  // 1. Sign in via signInAsTestUser helper
  // 2. Navigate to /plan/new, fill title, submit
  // 3. Assert share dialog opens with /i/[token] link
  // 4. Open the invite link in an incognito context — assert plan title visible without sign-in
});
