import { defineConfig, devices } from '@playwright/test';

// Keep the test browser in this workspace. This avoids a corrupted or missing
// user-level Playwright cache from making a clean checkout unable to test.
process.env.PLAYWRIGHT_BROWSERS_PATH ??= '0';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [['html'], ['list']] : 'list',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    // Use Chrome for Testing rather than the optional headless-shell download.
    // It is installed with the Chromium runtime and behaves like the browser
    // customers use, while avoiding a second browser binary dependency.
    channel: 'chromium',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },
  projects: [
    { name: 'desktop-chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile-chromium', use: { ...devices['Pixel 7'] } }
  ],
  webServer: {
    command: 'cmd /c npm.cmd run dev -- --host 127.0.0.1 --port 4173',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 30_000
  }
});
