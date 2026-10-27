/**
 * Demo mode: the app runs on built-in sample data, with no Supabase project and
 * no database. It turns on automatically when the production settings are missing
 * (DATABASE_URL or NEXT_PUBLIC_SUPABASE_URL), so a fresh deploy shows the real UI
 * instead of crashing, and it turns itself off as soon as both are configured.
 * Everything lives in server memory and resets when the server restarts.
 */
export function isDemo(): boolean {
  return !process.env.DATABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_URL;
}

export const DEMO_TRAINER = {
  id: "00000000-0000-4000-8000-00000000d3a0",
  email: "demo@antonia.app",
  displayName: "Antonia",
};
