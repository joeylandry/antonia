import postgres from "postgres";
import { SCHEMA } from "../../lib/db/schema";

/** Starts every run from an empty database whose profile has a known name. */
export default async function globalSetup() {
  const admin = postgres(process.env.E2E_ADMIN_DATABASE_URL!, { onnotice: () => {} });
  await admin.unsafe("drop database if exists antonia_e2e with (force)");
  await admin.unsafe("create database antonia_e2e");
  await admin.end();

  const db = postgres(process.env.E2E_DATABASE_URL!, { onnotice: () => {} });
  await db.unsafe(SCHEMA);
  await db`update app.profile set display_name = 'Antonia Test' where id = 1`;
  await db.end();
}
