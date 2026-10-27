import { defineConfig, devices } from "@playwright/test";

const APP_PORT = 3100;
const AUTH_PORT = 54398;
const DB_NAME = "antonia_e2e";
const ADMIN_URL = process.env.E2E_ADMIN_DATABASE_URL ?? "postgres://postgres@127.0.0.1:54329/postgres";
const DB_URL = ADMIN_URL.replace(/\/[^/]*$/, `/${DB_NAME}`);

// Picked up by e2e/support/*.ts
process.env.E2E_ADMIN_DATABASE_URL = ADMIN_URL;
process.env.E2E_DATABASE_URL = DB_URL;
process.env.E2E_AUTH_URL = `http://127.0.0.1:${AUTH_PORT}`;

export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/*.spec.ts",
  testIgnore: "**/demo/**",
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
      command: "node e2e/support/fake-auth-server.mjs",
      port: AUTH_PORT,
      reuseExistingServer: false,
      env: { FAKE_AUTH_DB: DB_URL, FAKE_AUTH_PORT: String(AUTH_PORT) },
    },
    {
      command: process.env.E2E_SKIP_BUILD ? `npx next start -p ${APP_PORT}` : `npx next build && npx next start -p ${APP_PORT}`,
      port: APP_PORT,
      timeout: 240_000,
      reuseExistingServer: false,
      env: {
        NEXT_PUBLIC_SUPABASE_URL: `http://127.0.0.1:${AUTH_PORT}`,
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "test-anon-key",
        DATABASE_URL: DB_URL,
        NEXT_PUBLIC_SITE_URL: `http://localhost:${APP_PORT}`,
      },
    },
  ],
});
