import "server-only";
import postgres from "postgres";
import { env } from "@/lib/env";

type Sql = postgres.Sql;
export type Tx = postgres.TransactionSql;

const globalForDb = globalThis as unknown as { __antoniaSql?: Sql };

function connect(): Sql {
  return postgres(env.databaseUrl, {
    // Supabase's transaction pooler does not support prepared statements.
    prepare: false,
    max: 10,
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

/**
 * Created on first use, not at import time: `next build` imports every route to
 * collect page data, and the build must not need DATABASE_URL (or a database).
 */
function getSql(): Sql {
  if (globalForDb.__antoniaSql) return globalForDb.__antoniaSql;
  const client = connect();
  // Reused across requests (and across dev hot reloads) so connections aren't leaked.
  globalForDb.__antoniaSql = client;
  return client;
}

/**
 * Runs `fn` in a transaction acting as `trainerId` under Row Level Security.
 * The `authenticated` role cannot bypass RLS, so even a bug in a query cannot
 * read or write another trainer's rows.
 */
export async function withTrainer<T>(trainerId: string, fn: (tx: Tx) => Promise<T>): Promise<T> {
  return getSql().begin(async (tx) => {
    await tx`select set_config('request.jwt.claims', ${JSON.stringify({ sub: trainerId, role: "authenticated" })}, true)`;
    await tx`select set_config('role', 'authenticated', true)`;
    return fn(tx);
  }) as Promise<T>;
}
