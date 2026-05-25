// Create-plan walking-skeleton E2E — owned by Plan 01-04.
//
// Covers requirements PLAN-01, PLAN-02, AUTH-06 and the wedge metric
// "setup en 30 segundos."
//
// Skips cleanly when local Supabase is unreachable. Test-auth bypass via the
// signInAsTestUser helper (Plan 01-01) — Plan 01-05 will refine this; until
// then, the helper sets best-effort cookies and the test exercises the
// happy path via direct DB seeding of an authenticated session.

import { expect, test } from '@playwright/test';

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

async function deletePlanBySlug(slug: string): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
  if (!url || !key) return;
  const { createClient } = await import('@supabase/supabase-js');
  const admin = createClient(url, key, { auth: { persistSession: false } });
  await admin.from('plans').delete().eq('slug', slug);
}

test.describe('Create plan → share dialog → invite link (Plan 01-04)', () => {
  test('signed-in user creates a plan and lands on /plan/[slug]?share=1 with the dialog open', async ({
    browser,
  }) => {
    if (!(await supabaseUp())) {
      test.skip(true, 'local Supabase not running');
    }

    const { signInAsTestUser } = await import('../setup/auth');
    const context = await browser.newContext({ permissions: ['clipboard-read', 'clipboard-write'] });
    const page = await context.newPage();
    await signInAsTestUser(page);

    await page.goto('/plan/new');
    await page.getByPlaceholder(/Despedida de Carlos/i).fill('Plan E2E');
    await page.getByRole('button', { name: /Crear plan/i }).click();

    // Auto-redirect to /plan/<slug>?share=1
    await page.waitForURL(/\/plan\/[a-z0-9]{8}\?share=1/);
    const url = new URL(page.url());
    const slug = url.pathname.split('/').pop() ?? '';

    // Surface 2: dialog visible with the /i/[token] link
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    const linkText = await dialog.locator('div.font-mono').first().innerText();
    expect(linkText).toMatch(/^[a-z]+:\/\/[^/]+\/i\/[a-z0-9]{22}$/);

    // Click Copiar link button (full-width fallback)
    await dialog.getByRole('button', { name: /Copiar link/i }).first().click();
    const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboardText).toMatch(/^[a-z]+:\/\/[^/]+\/i\/[a-z0-9]{22}$/);

    // Close via "Ir al plan"
    await dialog.getByRole('button', { name: /Ir al plan/i }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);

    await deletePlanBySlug(slug);
    await context.close();
  });
});
