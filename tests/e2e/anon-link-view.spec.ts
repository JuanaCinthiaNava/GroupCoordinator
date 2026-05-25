// Anonymous link-view E2E — owned by Plan 01-03.
// Covers requirements: AUTH-01, PLAN-03.
//
// These tests require local Supabase to be running. The Playwright webServer
// auto-starts `pnpm dev` (see playwright.config.ts). The tests skip when the
// Supabase health probe fails (host without Docker) — same posture as the
// Vitest integration suites.

import { expect, test } from '@playwright/test';

const VALID_TOKEN = 'seedvakjdtpken22charsx';
const REVOKED_TOKEN = 'seedrevpkedtpken22char';

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

test.describe('Anonymous invite-link view (Plan 01-03)', () => {
  test('opens /i/[seed-valid-token] in incognito and lands on plan page', async ({
    browser,
  }) => {
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
    // D-08 empty state — "Test Owner sigue agregando detalles."
    await expect(
      page.getByText(/Test Owner sigue agregando detalles\./),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Continuar con Google' }),
    ).toBeVisible();
    await context.close();
  });

  test('D-01 fallback: /plan/[slug]?t=[token] renders identically', async ({
    browser,
  }) => {
    if (!(await supabaseUp())) {
      test.skip(true, 'local Supabase not running');
    }
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(`/plan/seed-plan?t=${VALID_TOKEN}`);
    await page.waitForURL(/\/plan\/seed-plan(\?.*)?$/);
    await expect(
      page.getByRole('heading', { name: /Plan de prueba/ }),
    ).toBeVisible();
    await context.close();
  });

  test('revoked token routes to /errors/token-revoked', async ({ browser }) => {
    if (!(await supabaseUp())) {
      test.skip(true, 'local Supabase not running');
    }
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(`/i/${REVOKED_TOKEN}`);
    await page.waitForURL(/\/errors\/token-revoked/);
    await expect(
      page.getByRole('heading', { name: /Este link fue revocado/ }),
    ).toBeVisible();
    await context.close();
  });

  test('375px viewport — no horizontal scroll', async ({ browser }) => {
    if (!(await supabaseUp())) {
      test.skip(true, 'local Supabase not running');
    }
    const context = await browser.newContext({
      viewport: { width: 375, height: 812 },
    });
    const page = await context.newPage();
    await page.goto(`/i/${VALID_TOKEN}`);
    await page.waitForURL(/\/plan\/seed-plan(\?.*)?$/);
    const noOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    );
    expect(noOverflow).toBe(true);
    await context.close();
  });
});
