import { defineConfig, devices } from "@playwright/test";
const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3018";
const apiURL = "http://127.0.0.1:4010";
const databaseURL =
  process.env.QUIZBEE_E2E_DATABASE_URL ||
  "postgresql://quizbee:quizbee_local_only@127.0.0.1:55439/quizbee_v2_test?schema=public";
const testDatabase = new URL(databaseURL);
const testOrigin = new URL(baseURL);
if (
  !["localhost", "127.0.0.1"].includes(testDatabase.hostname) ||
  testDatabase.port !== "55439" ||
  testDatabase.pathname !== "/quizbee_v2_test"
) {
  throw new Error(
    "Browser tests require the isolated local QuizBee test database.",
  );
}
if (
  !["localhost", "127.0.0.1"].includes(testOrigin.hostname) ||
  testOrigin.port !== "3018"
) {
  throw new Error("Browser tests require the local port 3018 test server.");
}
export default defineConfig({
  testDir: "./tests/e2e",
  workers: 2,
  use: { baseURL, trace: "retain-on-failure" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    {
      name: "mobile",
      use: { ...devices["iPhone 13"], defaultBrowserType: "chromium" },
    },
  ],
  webServer: [
    {
      command: "npm --prefix ../services/platform run start",
      url: `${apiURL}/readyz`,
      reuseExistingServer: false,
      env: {
        API_HOST: "127.0.0.1",
        PORT: "4010",
        APP_ORIGIN: baseURL,
        ALLOW_LOCAL_HTTP: "true",
        PLATFORM_DATABASE_URL: databaseURL,
        STORAGE_DRIVER: "local",
        PRIVATE_STORAGE_DIR: ".quizbee-private/e2e",
      },
    },
    {
      command: "node tests/e2e/start-web.mjs",
      url: `${baseURL}/api/health`,
      reuseExistingServer: false,
      env: { PLATFORM_API_URL: apiURL },
    },
  ],
});
