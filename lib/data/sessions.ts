import "server-only";
import { getDb, newId, nowIso, tx, type Db } from "@/lib/db/client";
import type { Exercise, SessionEntry, SetEntry, WorkoutSession } from "@/lib/domain/types";
import type { SessionInput } from "@/lib/validation/session";

type EntryRow = {
  id: string;
  session_id: string;
  exercise_id: string;
  exercise_name: string;
  position: number;
  sets: string;
  notes: string | null;
};
type SessionRow = { id: string; client_id: string; session_date: string; focus: string | null; notes: string | null };

const ENTRY_SELECT = `select e.id, e.session_id, e.exercise_id, x.name as exercise_name, e.position, e.sets, e.notes
  from session_entries e join exercises x on x.id = e.exercise_id`;

function assemble(sessions: SessionRow[], entries: EntryRow[]): WorkoutSession[] {
  const byS = new Map<string, SessionEntry[]>();
  for (const e of entries) {
    const list = byS.get(e.session_id) ?? [];
    list.push({ id: e.id, exerciseId: e.exercise_id, exerciseName: e.exercise_name, position: e.position, sets: JSON.parse(e.sets), notes: e.notes });
    byS.set(e.session_id, list);
  }
  return sessions.map((s) => ({
    id: s.id,
    clientId: s.client_id,
    sessionDate: s.session_date,
    focus: s.focus,
    notes: s.notes,
    entries: byS.get(s.id) ?? [],
  }));
}

export async function listSessions(clientId: string): Promise<WorkoutSession[]> {
  const db = getDb();
  const sessions = db
    .prepare("select id, client_id, session_date, focus, notes from sessions where client_id = ? order by session_date desc, created_at desc")
    .all(clientId) as SessionRow[];
  if (!sessions.length) return [];
  const entries = db
    .prepare(`${ENTRY_SELECT} join sessions s on s.id = e.session_id where s.client_id = ? order by e.position`)
    .all(clientId) as EntryRow[];
  return assemble(sessions, entries);
}

export async function getSession(sessionId: string): Promise<WorkoutSession | null> {
  if (!/^[0-9a-f-]{36}$/i.test(sessionId)) return null;
  const db = getDb();
  const sessions = db.prepare("select id, client_id, session_date, focus, notes from sessions where id = ?").all(sessionId) as SessionRow[];
  if (!sessions.length) return null;
  const entries = db.prepare(`${ENTRY_SELECT} where e.session_id = ? order by e.position`).all(sessionId) as EntryRow[];
  return assemble(sessions, entries)[0];
}

/** Finds or creates an exercise by case-insensitive name. */
export function ensureExercise(db: Db, name: string): string {
  const trimmed = name.trim();
  const key = trimmed.toLowerCase();
  const found = db.prepare("select id from exercises where name_key = ?").get(key) as { id: string } | undefined;
  if (found) return found.id;
  const id = newId();
  db.prepare("insert into exercises (id, name, name_key, created_at) values (?, ?, ?, ?)").run(id, trimmed, key, nowIso());
  return id;
}

const cleanSets = (sets: SetEntry[]) =>
  sets
    .map((s) => ({
      ...(s.reps != null ? { reps: s.reps } : {}),
      ...(s.weight != null ? { weight: s.weight } : {}),
      ...(s.seconds != null ? { seconds: s.seconds } : {}),
    }))
    .filter((s) => Object.keys(s).length > 0);

/** Creates or replaces a session and its exercises atomically. Returns the session id, or null if not found. */
export async function saveSession(input: SessionInput, sessionId?: string): Promise<string | null> {
  return tx((db) => {
    let id = sessionId;
    const now = nowIso();
    if (id) {
      const { changes } = db
        .prepare("update sessions set session_date = ?, focus = ?, notes = ?, updated_at = ? where id = ? and client_id = ?")
        .run(input.sessionDate, input.focus ?? null, input.notes ?? null, now, id, input.clientId);
      if (!changes) return null;
      db.prepare("delete from session_entries where session_id = ?").run(id);
    } else {
      id = newId();
      db.prepare("insert into sessions (id, client_id, session_date, focus, notes, created_at, updated_at) values (?, ?, ?, ?, ?, ?, ?)").run(
        id,
        input.clientId,
        input.sessionDate,
        input.focus ?? null,
        input.notes ?? null,
        now,
        now,
      );
    }
    const insert = db.prepare("insert into session_entries (id, session_id, exercise_id, position, sets, notes) values (?, ?, ?, ?, ?, ?)");
    let position = 0;
    for (const e of input.entries) {
      insert.run(newId(), id, ensureExercise(db, e.exerciseName), position++, JSON.stringify(cleanSets(e.sets)), e.notes ?? null);
    }
    return id;
  });
}

export async function deleteSessionRecord(sessionId: string): Promise<boolean> {
  return getDb().prepare("delete from sessions where id = ?").run(sessionId).changes > 0;
}

/** All exercises used so far, most-used first, for the exercise picker. */
export async function listExercises(): Promise<(Exercise & { uses: number })[]> {
  const rows = getDb()
    .prepare(
      `select x.id, x.name, count(e.id) as uses
       from exercises x left join session_entries e on e.exercise_id = x.id
       group by x.id order by uses desc, lower(x.name)`,
    )
    .all() as { id: string; name: string; uses: number }[];
  return rows.map((r) => ({ ...r, uses: Number(r.uses) }));
}

export type LastPerformance = { exerciseId: string; date: string; sets: SetEntry[] };

type PerfRow = { exercise_id: string; name: string; session_date: string; sets: string };

/** The client's most recent performance of each exercise, optionally before a date (editing a past session). */
export async function lastPerformances(clientId: string, before?: string): Promise<Record<string, LastPerformance & { name: string }>> {
  const rows = getDb()
    .prepare(
      `select e.exercise_id, x.name, s.session_date, e.sets
       from session_entries e
       join sessions s on s.id = e.session_id
       join exercises x on x.id = e.exercise_id
       where s.client_id = ? and (? is null or s.session_date < ?)
       order by s.session_date desc, s.created_at desc`,
    )
    .all(clientId, before ?? null, before ?? null) as PerfRow[];
  const out: Record<string, LastPerformance & { name: string }> = {};
  for (const r of rows) {
    const key = r.name.toLowerCase();
    // Rows are newest first, so the first one seen per exercise is the latest.
    out[key] ??= { exerciseId: r.exercise_id, name: r.name, date: r.session_date, sets: JSON.parse(r.sets) };
  }
  return out;
}

export type HistoryRow = { exerciseId: string; exerciseName: string; date: string; sets: SetEntry[] };

/** Every logged exercise for a client, oldest first, used to build progress charts. */
export async function exerciseHistory(clientId: string): Promise<HistoryRow[]> {
  const rows = getDb()
    .prepare(
      `select e.exercise_id, x.name, s.session_date, e.sets
       from session_entries e
       join sessions s on s.id = e.session_id
       join exercises x on x.id = e.exercise_id
       where s.client_id = ?
       order by s.session_date, s.created_at`,
    )
    .all(clientId) as PerfRow[];
  return rows.map((r) => ({ exerciseId: r.exercise_id, exerciseName: r.name, date: r.session_date, sets: JSON.parse(r.sets) }));
}
