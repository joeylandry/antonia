import { defineConfig, devices } from "@playwright/test";

// Demo mode: the app started with NO Supabase / database settings, like a fresh deploy.
const PORT = 3300;
export default defineConfig({
  testDir: "./e2e/demo",
  workers: 1,
  reporter: [["list"]],
  use: { baseURL: `http://localhost:${PORT}`, trace: "retain-on-failure", screenshot: "only-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: process.env.E2E_SKIP_BUILD ? `npx next start -p ${PORT}` : `npx next build && npx next start -p ${PORT}`,
    port: PORT,
    timeout: 240_000,
    reuseExistingServer: false,
    // Deliberately empty: Next must not pick up a developer's .env.local either.
    env: { DATABASE_URL: "", NEXT_PUBLIC_SUPABASE_URL: "", NEXT_PUBLIC_SUPABASE_ANON_KEY: "", NEXT_PUBLIC_SITE_URL: "" },
  },
});
