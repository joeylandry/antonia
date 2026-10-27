import { readFileSync } from "node:fs";
import { join } from "node:path";
import postgres from "postgres";

/** Creates a fresh test database with the Supabase shim and all migrations applied. */
export default async function globalSetup() {
  const admin = postgres(process.env.E2E_ADMIN_DATABASE_URL!, { onnotice: () => {} });
  const name = "antonia_e2e";
  await admin.unsafe(`drop database if exists ${name} with (force)`);
  await admin.unsafe(`create database ${name}`);
  await admin.end();

  const db = postgres(process.env.E2E_DATABASE_URL!, { onnotice: () => {} });
  const root = process.cwd();
  await db.unsafe(readFileSync(join(root, "db/dev/supabase-shim.sql"), "utf8"));
  const { readdirSync } = await import("node:fs");
  for (const f of readdirSync(join(root, "db/migrations")).filter((x) => x.endsWith(".sql")).sort()) {
    await db.unsafe(readFileSync(join(root, "db/migrations", f), "utf8"));
  }
  await db.end();
}
