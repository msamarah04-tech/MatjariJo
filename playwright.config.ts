import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end tests. Requires browsers: run `npx playwright install` once, then
 * `npm run test:e2e`. The webServer block boots the frontend + API together.
 * Kept out of the default CI gate (browsers are heavy); run as a separate job.
 */
export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  fullyParallel: true,
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: 'npm run dev:all',
        url: 'http://localhost:3000',
        reuseExistingServer: !process.env.CI,
        timeout: 60_000,
      },
});
