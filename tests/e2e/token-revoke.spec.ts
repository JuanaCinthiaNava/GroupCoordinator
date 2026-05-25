// Owner-revokes-token E2E
//
// Un-skipped by: Plan 01-06 (settings page ships)
// Covers requirements: PLAN-04, AUTH-01 negative path
// Assertions inside should verify:
//   - Owner can navigate to /plan/[slug]/settings
//   - Revoking a token sets revoked_at and removes the row from the list
//   - Visiting the revoked /i/[token] redirects to /errors/token-revoked
//   - The Spanish error copy renders

import { test } from '@playwright/test';

test.describe.skip('Token revocation flow (Plan 01-06)', () => {
  test('TODO(Plan 01-06): unskip after settings page ships', () => {
    // Placeholder; implementation owned by Plan 01-06.
  });
});
