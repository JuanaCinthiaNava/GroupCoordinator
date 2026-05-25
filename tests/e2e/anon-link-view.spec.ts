// Anonymous link-view E2E
//
// Un-skipped by: Plan 01-03 (invite handler + plan view)
// Covers requirements: AUTH-01, PLAN-03
// Assertions inside should verify:
//   - Visiting /i/[token] mints an anonymous Supabase session with plan_id JWT claim
//   - 302 redirect to /plan/[slug]
//   - Plan title + creator + member list render without sign-in
//   - "Iniciar sesión" affordance visible

import { test } from '@playwright/test';

test.describe.skip('Anonymous invite-link view (Plan 01-03)', () => {
  test('TODO(Plan 01-03): unskip after invite handler + plan view land', () => {
    // Placeholder; implementation owned by Plan 01-03.
  });
});
