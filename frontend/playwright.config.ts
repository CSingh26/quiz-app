import { defineConfig, devices } from '@playwright/test';
const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3018';
const databaseURL = process.env.QUIZBEE_E2E_DATABASE_URL || 'postgresql://quizbee:quizbee_local_only@127.0.0.1:55439/quizbee_v2_test?schema=public';
const testDatabase = new URL(databaseURL);
const testOrigin = new URL(baseURL);
if (!['localhost', '127.0.0.1'].includes(testDatabase.hostname) || testDatabase.port !== '55439' || testDatabase.pathname !== '/quizbee_v2_test') {
  throw new Error('Browser tests require the isolated local QuizBee test database.');
}
if (!['localhost', '127.0.0.1'].includes(testOrigin.hostname) || testOrigin.port !== '3018') {
  throw new Error('Browser tests require the local port 3018 test server.');
}
export default defineConfig({
  testDir: './tests/e2e',
  workers: 2,
  use: { baseURL, trace: 'retain-on-failure' },
  projects: [{ name: 'desktop', use: { ...devices['Desktop Chrome'] } }, { name: 'mobile', use: { ...devices['iPhone 13'], defaultBrowserType: 'chromium' } }],
  webServer: {
    command: 'npm run start -- -H 127.0.0.1 -p 3018', url: baseURL, reuseExistingServer: false,
    env: {
      APP_ORIGIN: baseURL,
      ALLOW_LOCAL_HTTP: 'true',
      PLATFORM_DATABASE_URL: databaseURL,
    },
  },
});
