import "server-only";
import postgres from "postgres";
import { SCHEMA } from "./schema";

type Sql = postgres.Sql;
export type Tx = postgres.TransactionSql;

const globalForDb = globalThis as unknown as { __antoniaSql?: Sql; __antoniaReady?: Promise<void> };

/**
 * The connection string. Vercel's Postgres integration (Neon) sets DATABASE_URL;
 * older integrations set POSTGRES_URL.
 */
export function databaseUrl(): string {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!url) throw new Error("No database connected: set DATABASE_URL. See README → Deploy.");
  return url;
}

export function connect(url = databaseUrl()): Sql {
  return postgres(url, {
    // Pooled connection strings (pgbouncer in transaction mode) don't support prepared statements.
    prepare: false,
    max: 5,
    idle_timeout: 20,
    connect_timeout: 10,
    onnotice: () => {},
    types: {
      // Keep calendar dates as 'YYYY-MM-DD' strings so no timezone shifting can occur.
      date: { to: 1082, from: [1082], serialize: (v: unknown) => String(v), parse: (v: string) => v },
      numeric: { to: 1700, from: [1700], serialize: (v: unknown) => String(v), parse: (v: string) => Number(v) },
    },
  });
}

/** Creates the schema if it isn't there yet. The advisory lock stops two cold starts racing on the DDL. */
export async function ensureSchema(sql: Sql) {
  await sql.begin(async (tx) => {
    await tx`select pg_advisory_xact_lock(7366160501)`;
    await tx.unsafe(SCHEMA);
  });
}

/**
 * Connected on first use, not at import time: `next build` imports every route
 * to collect page data, and the build must not need a database.
 */
async function getSql(): Promise<Sql> {
  const sql = (globalForDb.__antoniaSql ??= connect());
  // Reused across requests (and dev hot reloads); a failed setup is retried on the next request.
  globalForDb.__antoniaReady ??= ensureSchema(sql).catch((e) => {
    globalForDb.__antoniaReady = undefined;
    throw e;
  });
  await globalForDb.__antoniaReady;
  return sql;
}

/** Runs `fn` in a transaction. */
export async function withDb<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
  return (await getSql()).begin(fn) as Promise<T>;
}

/** Test hook: use this connection (schema already applied) instead of DATABASE_URL. */
export function setSqlForTests(sql: Sql | undefined) {
  globalForDb.__antoniaSql = sql;
  globalForDb.__antoniaReady = sql ? Promise.resolve() : undefined;
}
