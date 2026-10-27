/**
 * Applies db/migrations/*.sql in order, once each, each inside a transaction.
 *   DATABASE_URL=postgres://... npm run db:migrate
 * Use the direct (or session-pooler) connection string for migrations.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is required.");
  process.exit(1);
}

const sql = postgres(url, { max: 1, onnotice: () => {} });
const dir = join(process.cwd(), "db", "migrations");

async function main() {
  await sql`create table if not exists public.schema_migrations (
    name text primary key,
    applied_at timestamptz not null default now()
  )`;
  const done = new Set((await sql`select name from public.schema_migrations`).map((r) => r.name as string));
  const files = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
  let applied = 0;
  for (const file of files) {
    if (done.has(file)) continue;
    console.log(`applying ${file}`);
    await sql.begin(async (tx) => {
      await tx.unsafe(readFileSync(join(dir, file), "utf8"));
      await tx`insert into public.schema_migrations (name) values (${file})`;
    });
    applied++;
  }
  console.log(applied ? `done: ${applied} migration(s) applied` : "database is up to date");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => sql.end());
