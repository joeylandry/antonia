import "server-only";
import { mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { SCHEMA } from "./schema";

export type Db = DatabaseSync;

const globalForDb = globalThis as unknown as { __antoniaDb?: Db };

/** Folder holding the data file. Must be on a disk that survives restarts and redeploys. */
export function dataDir(): string {
  return resolve(/*turbopackIgnore: true*/ process.env.DATA_DIR || join(process.cwd(), "data"));
}

export function openDb(file: string): Db {
  const db = new DatabaseSync(file);
  db.exec("pragma journal_mode = wal; pragma foreign_keys = on; pragma busy_timeout = 5000;");
  db.exec(SCHEMA);
  return db;
}

/**
 * Opened on first use, not at import time: `next build` imports every route to
 * collect page data, and the build must not create a data file.
 */
export function getDb(): Db {
  if (globalForDb.__antoniaDb) return globalForDb.__antoniaDb;
  if (process.env.VERCEL) {
    // Vercel's filesystem is wiped between invocations: every client record would be lost.
    throw new Error("The built-in data file needs a persistent disk; Vercel has none. See README → Deploy.");
  }
  const dir = dataDir();
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  const db = openDb(join(dir, "antonia.db"));
  // Reused across requests (and across dev hot reloads).
  globalForDb.__antoniaDb = db;
  return db;
}

/** Test hook: use an already-open database (e.g. ':memory:') instead of the data file. */
export function setDbForTests(db: Db | undefined) {
  globalForDb.__antoniaDb = db;
}

/**
 * Runs `fn` in a transaction. node:sqlite is synchronous, so nothing else can
 * run between BEGIN and COMMIT on this connection.
 */
export function tx<T>(fn: (db: Db) => T): T {
  const db = getDb();
  db.exec("begin immediate");
  try {
    const out = fn(db);
    db.exec("commit");
    return out;
  } catch (e) {
    db.exec("rollback");
    throw e;
  }
}

export const newId = () => crypto.randomUUID();
export const nowIso = () => new Date().toISOString();
