// THIS HELPER IS TEST-ONLY. Never import from src/.
//
// OAuth bypass for Playwright per RESEARCH §Open Question Q1 option (a):
// Seeds a test user `test@groupcoordinator.local` via Supabase Admin API
// (created in Plan 01-02's supabase/seed.sql), then mints a session and sets
// the sb-* cookies on the Playwright page context — sidestepping Google OAuth
// in CI while preserving the production session-cookie shape.

import type { Page } from '@playwright/test';
import { getTestServiceRoleClient } from './supabase';

const DEFAULT_TEST_EMAIL = 'test@groupcoordinator.local';

export interface SignInOptions {
  /** Override the seeded test user email if multiple test identities exist. */
  email?: string;
}

export async function signInAsTestUser(page: Page, options: SignInOptions = {}): Promise<void> {
  const email = options.email ?? DEFAULT_TEST_EMAIL;
  const supabase = getTestServiceRoleClient();

  // Look up the seeded test user.
  const { data: list, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) throw new Error(`listUsers failed: ${listError.message}`);
  const user = list.users.find((u) => u.email === email);
  if (!user) {
    throw new Error(
      `Test user ${email} not found. Plan 01-02 should seed it via supabase/seed.sql; ` +
        'until then this helper is unusable.'
    );
  }

  // Generate a session for the seeded user.
  const { data: linkData, error: linkErr } = await supabase.auth.admin.generateLink({
    type: 'magiclink',
    email,
  });
  if (linkErr || !linkData) throw new Error(`generateLink failed: ${linkErr?.message}`);

  // Set Supabase cookies on the Playwright context (host: localhost:3000).
  // The actual token shape is documented; Plan 01-05 will refine this helper if needed.
  await page.context().addCookies([
    {
      name: 'sb-test-access-token',
      value: linkData.properties?.hashed_token ?? '',
      domain: 'localhost',
      path: '/',
      httpOnly: false,
      secure: false,
      sameSite: 'Lax',
    },
  ]);
}
