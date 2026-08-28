import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright config for PathFinder end-to-end tests.
 *
 * Target the URL set in PLAYWRIGHT_BASE_URL, else the live Vercel deploy so
 * `npx playwright test` works with zero local setup. To run against local dev:
 *   PLAYWRIGHT_BASE_URL=http://localhost:5173 npx playwright test
 *
 * Auth-gated flows read PLAYWRIGHT_EMAIL / PLAYWRIGHT_PASSWORD and skip if
 * either is missing — we never bake credentials into the repo.
 */
export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  expect: { timeout: 8_000 },
  fullyParallel: true,
  reporter: [['list']],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'https://vortie-q.vercel.app',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
})
