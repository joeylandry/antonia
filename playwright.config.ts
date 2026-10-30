import { defineConfig, devices } from "@playwright/test";

const APP_PORT = 3100;
const ADMIN_URL = process.env.E2E_ADMIN_DATABASE_URL ?? "postgres://postgres:postgres@127.0.0.1:5432/postgres";
const DB_URL = ADMIN_URL.replace(/\/[^/]*$/, "/antonia_e2e");

// Picked up by e2e/support/global-setup.ts
process.env.E2E_ADMIN_DATABASE_URL = ADMIN_URL;
process.env.E2E_DATABASE_URL = DB_URL;

export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/*.spec.ts",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  globalSetup: "./e2e/support/global-setup.ts",
  use: {
    baseURL: `http://localhost:${APP_PORT}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: process.env.E2E_SKIP_BUILD ? `npx next start -p ${APP_PORT}` : `npx next build && npx next start -p ${APP_PORT}`,
      port: APP_PORT,
      timeout: 240_000,
      reuseExistingServer: false,
      env: {
        DATABASE_URL: DB_URL,
        // Hash of PASSCODE in e2e/support/helpers.ts (made with `npm run passcode`).
        PASSCODE_HASH: "scrypt:15:8:1:CmkhKipVWp4fy5AjW_9u0A:_24y7YUfXAEy2P6hn2MTfRL2EUXxG_-fH73o5704NZk",
      },
    },
  ],
});
