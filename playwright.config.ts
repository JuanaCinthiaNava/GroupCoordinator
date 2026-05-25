// Playwright config — Phase 1 Wave 0 test harness
//
// CRITICAL: Downstream plans (01-02 through 01-06) MUST invoke
//   `pnpm test:e2e tests/e2e/<spec>.spec.ts`
// directly. Playwright handles dev-server startup via the `webServer` block below.
// Do NOT background `pnpm dev` manually in verify blocks — it causes port collisions
// and non-deterministic sleeps.
//
// To install browsers before first run:
//   pnpm exec playwright install --with-deps chromium webkit
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],
  outputDir: './test-results',

  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium-desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 720 } },
    },
    {
      name: 'webkit-mobile',
      use: { ...devices['iPhone 12'] },
    },
  ],

  // webServer auto-starts the Next.js dev server before any test, so downstream
  // plans never need to background pnpm dev themselves.
  webServer: {
    command: 'pnpm dev',
    port: 3000,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
});
