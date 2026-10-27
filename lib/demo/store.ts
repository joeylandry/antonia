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
import { buildSeed } from "./seed";
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

function seed(): State {
  const data = buildSeed(todayIn(TZ));
  return { profile: { displayName: DEMO_TRAINER.displayName, timezone: TZ }, ...data };
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
