import "server-only";
import { randomUUID } from "node:crypto";
import { addDays, todayIn } from "@/lib/dates";
import { buildSeries, goalProgress } from "@/lib/domain/progress";
import type {
  Client,
  ClientListItem,
  ClientNote,
  Exercise,
  Goal,
  GoalKind,
  GoalStatus,
  Metric,
  MetricEntry,
  SessionEntry,
  SetEntry,
  WorkoutSession,
} from "@/lib/domain/types";
import type { ClientInput } from "@/lib/validation/client";
import type { GoalInput } from "@/lib/validation/goal";
import type { SessionInput } from "@/lib/validation/session";
import { DEMO_TRAINER } from "./mode";

/* All people, numbers and notes below are invented sample data. */

type State = {
  profile: { displayName: string; timezone: string };
  clients: Client[];
  exercises: Exercise[];
  sessions: WorkoutSession[];
  goals: Goal[];
  metrics: { metric: Metric; entries: MetricEntry[] }[];
  notes: ClientNote[];
};

const globalForDemo = globalThis as unknown as { __antoniaDemo?: State };
const TZ = "America/New_York";
const today = () => todayIn(globalForDemo.__antoniaDemo?.profile.timezone ?? TZ);
const rep = (n: number, reps: number, weight?: number): SetEntry[] => Array.from({ length: n }, () => ({ reps, ...(weight ? { weight } : {}) }));

function seed(): State {
  const t = todayIn(TZ);
  const ago = (n: number) => addDays(t, -n);
  const ahead = (n: number) => addDays(t, n);
  const s: State = { profile: { displayName: DEMO_TRAINER.displayName, timezone: TZ }, clients: [], exercises: [], sessions: [], goals: [], metrics: [], notes: [] };

  const ex = (name: string) => {
    let e = s.exercises.find((x) => x.name.toLowerCase() === name.toLowerCase());
    if (!e) s.exercises.push((e = { id: randomUUID(), name }));
    return e;
  };
  const client = (c: Partial<Client> & { fullName: string }): Client => {
    const full: Client = {
      id: randomUUID(), kind: "personal_training", status: "active", primaryGoal: null, healthNotes: null, email: null, phone: null,
      startDate: null, assessmentDate: ago(30), nextReviewDate: null, lastReviewedOn: null, sessionLengthMin: null, sessionsPerWeek: null,
      archivedAt: null, createdAt: new Date(Date.now() - 40 * 86_400_000), ...c,
    };
    s.clients.push(full);
    return full;
  };
  const session = (clientId: string, daysAgo: number, focus: string, entries: [string, SetEntry[], string?][], notes?: string) => {
    s.sessions.push({
      id: randomUUID(), clientId, sessionDate: ago(daysAgo), focus, notes: notes ?? null,
      entries: entries.map(([name, sets, n], i) => ({ id: randomUUID(), exerciseId: ex(name).id, exerciseName: name, position: i, sets, notes: n ?? null })),
    });
  };

  const jordan = client({
    fullName: "Jordan Rivera", primaryGoal: "Squatting 180 by end of Oct, 250 by March; benching 130.", startDate: ago(21), assessmentDate: ago(28),
    nextReviewDate: ahead(9), sessionLengthMin: 60, sessionsPerWeek: 2, healthNotes: "Old left knee tweak; avoid deep lunges.", email: "jordan@example.com",
  });
  session(jordan.id, 21, "Lower Body", [
    ["Goblet Squat", [{ reps: 12, weight: 24 }, { reps: 12, weight: 24 }], "Felt easy, focus on feet hips-width apart"],
    ["Dumbbell RDL", [{ reps: 12, weight: 15 }, { reps: 12, weight: 20 }], "Bending knees and letting gravity take you down"],
    ["Lateral Band Walk", rep(2, 8), "Orange band, steps farther with the right leg"],
  ]);
  session(jordan.id, 20, "Upper Body", [
    ["Dumbbell Bench Press", [{ reps: 12, weight: 15 }, { reps: 14, weight: 15 }], "Good angles"],
    ["Seated Row", [{ reps: 12, weight: 25 }, { reps: 10, weight: 25 }, { reps: 5, weight: 55 }], "Shoulders rolled, good form"],
    ["High Plank", [{ seconds: 20 }, { seconds: 40 }], "20 seconds felt easy so we moved to 40s"],
  ]);
  for (const [d, w] of [[14, 95], [10, 105], [7, 115], [3, 125]] as const) {
    session(jordan.id, d, "Lower Body", [["Back Squat", [{ reps: 8, weight: w - 20 }, { reps: 5, weight: w }], "Depth improving"], ["Leg Press", rep(2, 12, 55 + (21 - d) * 2)]]);
  }
  session(jordan.id, 5, "Upper Body", [["Dumbbell Bench Press", [{ reps: 10, weight: 25 }, { reps: 8, weight: 30 }]], ["Bench Press", [{ reps: 5, weight: 85 }, { reps: 5, weight: 95 }]]]);
  session(jordan.id, 1, "Fundamentals / Full Body Day", [["Leg Press", [{ reps: 12, weight: 55 }, { reps: 12, weight: 70 }]], ["KB Deadlift", rep(2, 12, 32)], ["Heel Slides", rep(2, 10)], ["90/90s", rep(2, 10)], ["Cossack Squat", rep(2, 12)]]);
  s.goals.push(
    { id: randomUUID(), clientId: jordan.id, kind: "lift", title: "Squat 180 lb by end of October", exerciseId: ex("Back Squat").id, exerciseName: "Back Squat", targetValue: 180, targetDate: ahead(4), status: "active", achievedOn: null },
    { id: randomUUID(), clientId: jordan.id, kind: "lift", title: "Squat 250 lb by March", exerciseId: ex("Back Squat").id, exerciseName: "Back Squat", targetValue: 250, targetDate: ahead(130), status: "active", achievedOn: null },
    { id: randomUUID(), clientId: jordan.id, kind: "lift", title: "Bench 130 lb", exerciseId: ex("Bench Press").id, exerciseName: "Bench Press", targetValue: 130, targetDate: null, status: "active", achievedOn: null },
  );
  const bw: Metric = { id: randomUUID(), clientId: jordan.id, name: "Body weight", unit: "lb", direction: "neutral" };
  s.metrics.push({ metric: bw, entries: ([[21, 168.4], [14, 167.8], [7, 168.2], [1, 167.1]] as const).map(([d, v]) => ({ id: randomUUID(), metricId: bw.id, entryDate: ago(d), value: v, note: null })) });
  s.notes.push({ id: randomUUID(), clientId: jordan.id, body: "Prefers morning sessions. Training for a fall hiking trip.", createdAt: new Date(Date.now() - 3 * 86_400_000) });

  const people: [string, "personal_training" | "fitness_assessment", "active" | "on_hold" | "inactive", string | null, number | null, number | null][] = [
    ["Casey Morgan", "personal_training", "active", "Building a shelf, losing weight, gaining strength.", 2, 8],
    ["Riley Chen", "personal_training", "active", "Getting stronger, getting back into lifting heavy.", -3, 30],
    ["Sam Okafor", "fitness_assessment", "active", "Preparing to hike the 4000 footers.", 6, null],
    ["Taylor Brooks", "personal_training", "on_hold", "Gaining strength, improving shoulder problems.", null, 40],
    ["Avery Nguyen", "fitness_assessment", "inactive", null, null, null],
    ["Morgan Delgado", "personal_training", "active", "Improving BMD, general strength.", 20, 3],
    ["Quinn Abernathy-Whitfield", "personal_training", "active", "Build strength steadily, travel more, protect the lower back, and feel confident carrying groceries up three flights of stairs.", 12, 15],
  ];
  for (const [fullName, kind, status, goal, review, last] of people) {
    const c = client({ fullName, kind, status, primaryGoal: goal, nextReviewDate: review == null ? null : ahead(review) });
    if (last != null) {
      session(c.id, last, "Full Body", [["Goblet Squat", rep(3, 10, 20)], ["Seated Row", rep(3, 10, 40)]]);
      session(c.id, last + 7, "Full Body", [["Goblet Squat", rep(3, 10, 15)], ["Seated Row", rep(3, 10, 35)]]);
    }
  }
  return s;
}

function st(): State {
  return (globalForDemo.__antoniaDemo ??= seed());
}

const byDateDesc = (a: WorkoutSession, b: WorkoutSession) => b.sessionDate.localeCompare(a.sessionDate);
const clone = <T>(v: T): T => structuredClone(v);

function ensureExercise(name: string): Exercise {
  const s = st();
  const key = name.trim().toLowerCase();
  let e = s.exercises.find((x) => x.name.toLowerCase() === key);
  if (!e) s.exercises.push((e = { id: randomUUID(), name: name.trim() }));
  return e;
}

/* ---- profile -------------------------------------------------------------- */
export const profile = () => st().profile;
export function updateProfile(v: { displayName: string; timezone: string }) {
  Object.assign(st().profile, v);
}

/* ---- clients -------------------------------------------------------------- */
export function listClients(opts: { archived?: boolean } = {}): ClientListItem[] {
  const s = st();
  return s.clients
    .filter((c) => (opts.archived ? c.archivedAt != null : c.archivedAt == null))
    .map((c) => {
      const mine = s.sessions.filter((x) => x.clientId === c.id);
      return {
        ...clone(c),
        lastSessionDate: mine.length ? mine.map((x) => x.sessionDate).sort().at(-1)! : null,
        sessionCount: mine.length,
        activeGoalCount: s.goals.filter((g) => g.clientId === c.id && g.status === "active").length,
      };
    })
    .sort((a, b) => a.fullName.localeCompare(b.fullName));
}
export const getClient = (id: string) => clone(st().clients.find((c) => c.id === id) ?? null);

function fromInput(i: ClientInput): Partial<Client> {
  return {
    fullName: i.fullName, kind: i.kind, status: i.status, primaryGoal: i.primaryGoal ?? null, healthNotes: i.healthNotes ?? null, email: i.email ?? null,
    phone: i.phone ?? null, startDate: i.startDate ?? null, assessmentDate: i.assessmentDate ?? null, nextReviewDate: i.nextReviewDate ?? null,
    sessionLengthMin: i.sessionLengthMin ?? null, sessionsPerWeek: i.sessionsPerWeek ?? null,
  };
}
export function createClientRecord(i: ClientInput): string {
  const c: Client = {
    id: randomUUID(), lastReviewedOn: null, archivedAt: null, createdAt: new Date(), ...(fromInput(i) as Omit<Client, "id" | "lastReviewedOn" | "archivedAt" | "createdAt">),
  };
  st().clients.push(c);
  return c.id;
}
export function updateClientRecord(id: string, i: ClientInput): boolean {
  const c = st().clients.find((x) => x.id === id);
  if (!c) return false;
  Object.assign(c, fromInput(i));
  return true;
}
export function setClientArchived(id: string, archived: boolean): boolean {
  const c = st().clients.find((x) => x.id === id);
  if (!c) return false;
  c.archivedAt = archived ? new Date() : null;
  return true;
}
export function completeReview(id: string, on: string, next: string | null): boolean {
  const c = st().clients.find((x) => x.id === id);
  if (!c) return false;
  c.lastReviewedOn = on;
  c.nextReviewDate = next;
  return true;
}
export function deleteClientRecord(id: string): boolean {
  const s = st();
  const had = s.clients.some((c) => c.id === id);
  s.clients = s.clients.filter((c) => c.id !== id);
  s.sessions = s.sessions.filter((x) => x.clientId !== id);
  s.goals = s.goals.filter((g) => g.clientId !== id);
  s.metrics = s.metrics.filter((m) => m.metric.clientId !== id);
  s.notes = s.notes.filter((n) => n.clientId !== id);
  return had;
}

/* ---- sessions ------------------------------------------------------------- */
export const listSessions = (clientId: string) => clone(st().sessions.filter((x) => x.clientId === clientId).sort(byDateDesc));
export const getSession = (id: string) => clone(st().sessions.find((x) => x.id === id) ?? null);

const cleanSets = (sets: SetEntry[]) =>
  sets
    .map((x) => ({ ...(x.reps != null ? { reps: x.reps } : {}), ...(x.weight != null ? { weight: x.weight } : {}), ...(x.seconds != null ? { seconds: x.seconds } : {}) }))
    .filter((x) => Object.keys(x).length > 0);

export function saveSession(input: SessionInput, sessionId?: string): string | null {
  const s = st();
  if (!s.clients.some((c) => c.id === input.clientId)) return null;
  const entries: SessionEntry[] = input.entries.map((e, i) => {
    const exercise = ensureExercise(e.exerciseName);
    return { id: randomUUID(), exerciseId: exercise.id, exerciseName: exercise.name, position: i, sets: cleanSets(e.sets), notes: e.notes ?? null };
  });
  if (sessionId) {
    const existing = s.sessions.find((x) => x.id === sessionId && x.clientId === input.clientId);
    if (!existing) return null;
    Object.assign(existing, { sessionDate: input.sessionDate, focus: input.focus ?? null, notes: input.notes ?? null, entries });
    return existing.id;
  }
  const created: WorkoutSession = { id: randomUUID(), clientId: input.clientId, sessionDate: input.sessionDate, focus: input.focus ?? null, notes: input.notes ?? null, entries };
  s.sessions.push(created);
  return created.id;
}
export function deleteSessionRecord(id: string): boolean {
  const s = st();
  const had = s.sessions.some((x) => x.id === id);
  s.sessions = s.sessions.filter((x) => x.id !== id);
  return had;
}
export function listExercises(): (Exercise & { uses: number })[] {
  const s = st();
  return s.exercises
    .map((e) => ({ ...e, uses: s.sessions.reduce((n, x) => n + x.entries.filter((y) => y.exerciseId === e.id).length, 0) }))
    .sort((a, b) => b.uses - a.uses || a.name.localeCompare(b.name));
}
export function lastPerformances(clientId: string, before?: string) {
  const out: Record<string, { exerciseId: string; name: string; date: string; sets: SetEntry[] }> = {};
  for (const x of st().sessions.filter((y) => y.clientId === clientId && (!before || y.sessionDate < before)).sort(byDateDesc)) {
    for (const e of x.entries) {
      const key = e.exerciseName.toLowerCase();
      if (!out[key]) out[key] = { exerciseId: e.exerciseId, name: e.exerciseName, date: x.sessionDate, sets: clone(e.sets) };
    }
  }
  return out;
}
export function exerciseHistory(clientId: string) {
  return st()
    .sessions.filter((x) => x.clientId === clientId)
    .sort((a, b) => a.sessionDate.localeCompare(b.sessionDate))
    .flatMap((x) => x.entries.map((e) => ({ exerciseId: e.exerciseId, exerciseName: e.exerciseName, date: x.sessionDate, sets: clone(e.sets) })));
}

/* ---- goals ---------------------------------------------------------------- */
export const listGoals = (clientId: string) =>
  clone(
    st()
      .goals.filter((g) => g.clientId === clientId)
      .sort((a, b) => Number(b.status === "active") - Number(a.status === "active") || (a.targetDate ?? "9999").localeCompare(b.targetDate ?? "9999")),
  );
const goalFields = (i: GoalInput) => {
  const ex = i.kind === "lift" ? ensureExercise(i.exerciseName!) : null;
  return { kind: i.kind as GoalKind, title: i.title, exerciseId: ex?.id ?? null, exerciseName: ex?.name ?? null, targetValue: i.kind === "lift" ? (i.targetValue ?? null) : null, targetDate: i.targetDate ?? null };
};
export function createGoal(clientId: string, i: GoalInput): string {
  const g: Goal = { id: randomUUID(), clientId, status: "active", achievedOn: null, ...goalFields(i) };
  st().goals.push(g);
  return g.id;
}
export function updateGoal(id: string, i: GoalInput): boolean {
  const g = st().goals.find((x) => x.id === id);
  if (!g) return false;
  Object.assign(g, goalFields(i));
  return true;
}
export function setGoalStatus(id: string, status: GoalStatus, on: string): boolean {
  const g = st().goals.find((x) => x.id === id);
  if (!g) return false;
  g.status = status;
  g.achievedOn = status === "achieved" ? on : null;
  return true;
}
export function deleteGoal(id: string): boolean {
  const s = st();
  const had = s.goals.some((g) => g.id === id);
  s.goals = s.goals.filter((g) => g.id !== id);
  return had;
}

/* ---- measurements --------------------------------------------------------- */
export const listMetrics = (clientId: string) =>
  clone(st().metrics.filter((m) => m.metric.clientId === clientId).map((m) => ({ metric: m.metric, entries: [...m.entries].sort((a, b) => a.entryDate.localeCompare(b.entryDate)) })));
export function createMetric(clientId: string, v: { name: string; unit: string; direction: string }): string {
  const s = st();
  if (s.metrics.some((m) => m.metric.clientId === clientId && m.metric.name.trim().toLowerCase() === v.name.trim().toLowerCase())) {
    throw new Error("duplicate metrics_client_name_idx");
  }
  const metric: Metric = { id: randomUUID(), clientId, name: v.name, unit: v.unit, direction: v.direction as Metric["direction"] };
  s.metrics.push({ metric, entries: [] });
  return metric.id;
}
export function deleteMetric(id: string): boolean {
  const s = st();
  const had = s.metrics.some((m) => m.metric.id === id);
  s.metrics = s.metrics.filter((m) => m.metric.id !== id);
  return had;
}
export function upsertMetricEntry(metricId: string, v: { entryDate: string; value: number; note?: string }): boolean {
  const m = st().metrics.find((x) => x.metric.id === metricId);
  if (!m) return false;
  const existing = m.entries.find((e) => e.entryDate === v.entryDate);
  if (existing) Object.assign(existing, { value: v.value, note: v.note ?? null });
  else m.entries.push({ id: randomUUID(), metricId, entryDate: v.entryDate, value: v.value, note: v.note ?? null });
  return true;
}
export function deleteMetricEntry(id: string): boolean {
  let had = false;
  for (const m of st().metrics) {
    const n = m.entries.length;
    m.entries = m.entries.filter((e) => e.id !== id);
    had ||= m.entries.length !== n;
  }
  return had;
}

/* ---- notes ---------------------------------------------------------------- */
export const listNotes = (clientId: string) => clone(st().notes.filter((n) => n.clientId === clientId).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()));
export function createNote(clientId: string, body: string): string {
  const n: ClientNote = { id: randomUUID(), clientId, body, createdAt: new Date() };
  st().notes.push(n);
  return n.id;
}
export function updateNote(id: string, body: string): boolean {
  const n = st().notes.find((x) => x.id === id);
  if (!n) return false;
  n.body = body;
  return true;
}
export function deleteNote(id: string): boolean {
  const s = st();
  const had = s.notes.some((n) => n.id === id);
  s.notes = s.notes.filter((n) => n.id !== id);
  return had;
}

/* ---- dashboard ------------------------------------------------------------ */
export function recentSessions(limit = 6) {
  const s = st();
  return s.sessions
    .filter((x) => s.clients.find((c) => c.id === x.clientId)?.archivedAt == null)
    .sort(byDateDesc)
    .slice(0, limit)
    .map((x) => ({ id: x.id, clientId: x.clientId, clientName: s.clients.find((c) => c.id === x.clientId)!.fullName, sessionDate: x.sessionDate, focus: x.focus, exerciseCount: x.entries.length }));
}
export function goalsDueSoon(todayYmd: string, withinDays = 21) {
  const s = st();
  const until = addDays(todayYmd, withinDays);
  return s.goals
    .filter((g) => g.status === "active" && g.kind === "lift" && g.targetDate && g.targetDate <= until)
    .map((g) => ({ g, c: s.clients.find((c) => c.id === g.clientId) }))
    .filter(({ c }) => c && c.archivedAt == null && c.status !== "inactive")
    .sort((a, b) => a.g.targetDate!.localeCompare(b.g.targetDate!))
    .map(({ g, c }) => {
      const series = buildSeries(exerciseHistory(g.clientId).filter((h) => h.exerciseId === g.exerciseId), "top_weight");
      const p = goalProgress(g, series, todayYmd)!;
      return { id: g.id, clientId: g.clientId, clientName: c!.fullName, title: g.title, targetDate: g.targetDate!, percent: p.percent, achieved: p.achieved, daysLeft: p.daysLeft ?? 0 };
    });
}
export function sessionsThisWeek(todayYmd: string): number {
  const s = st();
  return s.sessions.filter((x) => x.sessionDate > addDays(todayYmd, -7) && x.sessionDate <= todayYmd && s.clients.find((c) => c.id === x.clientId)?.archivedAt == null).length;
}

/* ---- export --------------------------------------------------------------- */
export function exportAll() {
  const s = st();
  return { exportedAt: new Date().toISOString(), schemaVersion: 1, demo: true, today: today(), ...clone({ clients: s.clients, exercises: s.exercises, sessions: s.sessions, goals: s.goals, metrics: s.metrics, clientNotes: s.notes }) };
}
