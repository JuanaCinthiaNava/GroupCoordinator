// Anonymous → authenticated OAuth upgrade E2E
//
// Un-skipped by: Plan 01-05 (OAuth callback wires plan_members upsert)
// Covers requirements: AUTH-02, AUTH-04, AUTH-06
// Assertions inside should verify:
//   - linkIdentity preserves the anonymous user_id across the OAuth callback
//   - plan_members row inserted with role from invite_token
//   - Redirect returns user to the same /plan/[slug] (next param honoured)
//   - Avatar replaces "Iniciar sesión" in the header

import { test } from '@playwright/test';

test.describe.skip('OAuth upgrade preserves anonymous context (Plan 01-05)', () => {
  test('TODO(Plan 01-05): unskip after OAuth callback wires plan_members upsert', () => {
    // Placeholder; implementation owned by Plan 01-05.
  });
});
