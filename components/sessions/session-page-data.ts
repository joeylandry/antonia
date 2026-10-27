import "server-only";
import { listExercises, listSessions, lastPerformances } from "@/lib/data/sessions";
import type { WorkoutSession } from "@/lib/domain/types";

/** Everything the session editor needs besides the session itself. */
export async function loadEditorData(trainerId: string, clientId: string, before?: string) {
  const [exercises, sessions, last] = await Promise.all([
    listExercises(trainerId),
    listSessions(trainerId, clientId),
    lastPerformances(trainerId, clientId, before),
  ]);
  const focusCounts = new Map<string, number>();
  for (const s of sessions) if (s.focus) focusCounts.set(s.focus, (focusCounts.get(s.focus) ?? 0) + 1);
  const focusOptions = [...focusCounts.entries()].sort((a, b) => b[1] - a[1]).map(([f]) => f);
  const previousSession: WorkoutSession | null = before ? (sessions.find((s) => s.sessionDate < before) ?? null) : (sessions[0] ?? null);
  const lastByName = Object.fromEntries(Object.entries(last).map(([k, v]) => [k, { date: v.date, sets: v.sets }]));
  return { exerciseNames: exercises.map((e) => e.name), focusOptions, lastByName, previousSession, sessions };
}
