// Walking Skeleton — Phase 1 E2E gate
//
// Un-skipped by: Plan 01-04 (and implicitly gated by Plan 01-02 schema/seed)
// Covers requirements: PLAN-01, PLAN-02, PLAN-03, AUTH-04
// Phase 01-01 placeholder: assert the marketing landing renders the tagline.
// Full create-plan → share-dialog → anonymous-view flow lands in Plan 01-04.

import { expect, test } from '@playwright/test';

test('marketing landing renders the Spanish tagline', async ({ page }) => {
  await page.goto('/');
  // The /[locale] route with `localePrefix: 'as-needed'` serves Spanish at /.
  await expect(
    page.getByRole('heading', { name: 'Nunca más pierdas la reserva en el chat del grupo.' })
  ).toBeVisible();
});

// TODO(Plan 01-04): unskip after createPlan Server Action + share dialog land.
test.skip('Walking Skeleton: create plan and view invite link end-to-end', async () => {
  // 1. Sign in via signInAsTestUser helper
  // 2. Navigate to /plan/new, fill title, submit
  // 3. Assert share dialog opens with /i/[token] link
  // 4. Open the invite link in an incognito context — assert plan title visible without sign-in
});
