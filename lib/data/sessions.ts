import "server-only";
import { isDemo } from "@/lib/demo/mode";
import * as demo from "@/lib/demo/store";
import { withTrainer, type Tx } from "@/lib/db/client";
import type { Exercise, SessionEntry, SetEntry, WorkoutSession } from "@/lib/domain/types";
import type { SessionInput } from "@/lib/validation/session";

type EntryRow = {
  id: string;
  session_id: string;
  exercise_id: string;
  exercise_name: string;
  position: number;
  sets: SetEntry[];
  notes: string | null;
};
type SessionRow = { id: string; client_id: string; session_date: string; focus: string | null; notes: string | null };

function assemble(sessions: SessionRow[], entries: EntryRow[]): WorkoutSession[] {
  const byS = new Map<string, SessionEntry[]>();
  for (const e of entries) {
    const list = byS.get(e.session_id) ?? [];
    list.push({ id: e.id, exerciseId: e.exercise_id, exerciseName: e.exercise_name, position: e.position, sets: e.sets, notes: e.notes });
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

export async function listSessions(trainerId: string, clientId: string): Promise<WorkoutSession[]> {
  if (isDemo()) return demo.listSessions(clientId);
  return withTrainer(trainerId, async (tx) => {
    const sessions = await tx<SessionRow[]>`
      select id, client_id, session_date, focus, notes from public.sessions
      where client_id = ${clientId} order by session_date desc, created_at desc`;
    if (!sessions.length) return [];
    const entries = await tx<EntryRow[]>`
      select e.id, e.session_id, e.exercise_id, x.name as exercise_name, e.position, e.sets, e.notes
      from public.session_entries e join public.exercises x on x.id = e.exercise_id
      where e.session_id in ${tx(sessions.map((s) => s.id))} order by e.position`;
    return assemble(sessions, entries);
  });
}

export async function getSession(trainerId: string, sessionId: string): Promise<WorkoutSession | null> {
  if (isDemo()) return demo.getSession(sessionId);
  if (!/^[0-9a-f-]{36}$/i.test(sessionId)) return null;
  return withTrainer(trainerId, async (tx) => {
    const sessions = await tx<SessionRow[]>`
      select id, client_id, session_date, focus, notes from public.sessions where id = ${sessionId}`;
    if (!sessions.length) return null;
    const entries = await tx<EntryRow[]>`
      select e.id, e.session_id, e.exercise_id, x.name as exercise_name, e.position, e.sets, e.notes
      from public.session_entries e join public.exercises x on x.id = e.exercise_id
      where e.session_id = ${sessionId} order by e.position`;
    return assemble(sessions, entries)[0];
  });
}

/** Finds or creates exercises by case-insensitive name; returns ids in input order. */
async function ensureExercises(tx: Tx, trainerId: string, names: string[]): Promise<Map<string, string>> {
  const ids = new Map<string, string>();
  for (const name of names) {
    const key = name.trim().toLowerCase();
    if (ids.has(key)) continue;
    const [row] = await tx<{ id: string }[]>`
      insert into public.exercises (trainer_id, name) values (${trainerId}, ${name.trim()})
      on conflict (trainer_id, name_key) do update set name = public.exercises.name
      returning id`;
    ids.set(key, row.id);
  }
  return ids;
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
export async function saveSession(trainerId: string, input: SessionInput, sessionId?: string): Promise<string | null> {
  if (isDemo()) return demo.saveSession(input, sessionId);
  return withTrainer(trainerId, async (tx) => {
    let id = sessionId;
    if (id) {
      const rows = await tx`
        update public.sessions set session_date = ${input.sessionDate}, focus = ${input.focus ?? null}, notes = ${input.notes ?? null}
        where id = ${id} and client_id = ${input.clientId} returning id`;
      if (!rows.length) return null;
      await tx`delete from public.session_entries where session_id = ${id}`;
    } else {
      const [row] = await tx<{ id: string }[]>`
        insert into public.sessions (trainer_id, client_id, session_date, focus, notes)
        values (${trainerId}, ${input.clientId}, ${input.sessionDate}, ${input.focus ?? null}, ${input.notes ?? null})
        returning id`;
      id = row.id;
    }
    const exerciseIds = await ensureExercises(tx, trainerId, input.entries.map((e) => e.exerciseName));
    let position = 0;
    for (const e of input.entries) {
      await tx`
        insert into public.session_entries (trainer_id, session_id, exercise_id, position, sets, notes)
        values (${trainerId}, ${id}, ${exerciseIds.get(e.exerciseName.trim().toLowerCase())!}, ${position++},
                ${tx.json(cleanSets(e.sets))}, ${e.notes ?? null})`;
    }
    return id;
  });
}

export async function deleteSessionRecord(trainerId: string, sessionId: string): Promise<boolean> {
  if (isDemo()) return demo.deleteSessionRecord(sessionId);
  return withTrainer(trainerId, async (tx) => {
    const rows = await tx`delete from public.sessions where id = ${sessionId} returning id`;
    return rows.length > 0;
  });
}

/** All exercises the trainer has used, most-used first, for the exercise picker. */
export async function listExercises(trainerId: string): Promise<(Exercise & { uses: number })[]> {
  if (isDemo()) return demo.listExercises();
  return withTrainer(trainerId, async (tx) => {
    const rows = await tx<{ id: string; name: string; uses: number }[]>`
      select x.id, x.name, count(e.id)::int as uses
      from public.exercises x left join public.session_entries e on e.exercise_id = x.id
      group by x.id order by uses desc, lower(x.name)`;
    return rows;
  });
}

export type LastPerformance = { exerciseId: string; date: string; sets: SetEntry[] };

/** The client's most recent performance of each exercise, optionally before a date (editing a past session). */
export async function lastPerformances(trainerId: string, clientId: string, before?: string): Promise<Record<string, LastPerformance & { name: string }>> {
  if (isDemo()) return demo.lastPerformances(clientId, before);
  return withTrainer(trainerId, async (tx) => {
    const rows = await tx<{ exercise_id: string; name: string; session_date: string; sets: SetEntry[] }[]>`
      select distinct on (e.exercise_id) e.exercise_id, x.name, s.session_date, e.sets
      from public.session_entries e
      join public.sessions s on s.id = e.session_id
      join public.exercises x on x.id = e.exercise_id
      where s.client_id = ${clientId} ${before ? tx`and s.session_date < ${before}` : tx``}
      order by e.exercise_id, s.session_date desc, s.created_at desc`;
    const out: Record<string, LastPerformance & { name: string }> = {};
    for (const r of rows) out[r.name.toLowerCase()] = { exerciseId: r.exercise_id, name: r.name, date: r.session_date, sets: r.sets };
    return out;
  });
}

export type HistoryRow = { exerciseId: string; exerciseName: string; date: string; sets: SetEntry[] };

/** Every logged exercise for a client, oldest first, used to build progress charts. */
export async function exerciseHistory(trainerId: string, clientId: string): Promise<HistoryRow[]> {
  if (isDemo()) return demo.exerciseHistory(clientId);
  return withTrainer(trainerId, async (tx) => {
    const rows = await tx<{ exercise_id: string; name: string; session_date: string; sets: SetEntry[] }[]>`
      select e.exercise_id, x.name, s.session_date, e.sets
      from public.session_entries e
      join public.sessions s on s.id = e.session_id
      join public.exercises x on x.id = e.exercise_id
      where s.client_id = ${clientId}
      order by s.session_date, s.created_at`;
    return rows.map((r) => ({ exerciseId: r.exercise_id, exerciseName: r.name, date: r.session_date, sets: r.sets }));
  });
}
