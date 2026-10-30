import { describe, expect, it } from "vitest";
import { TEST_DATABASE_URL, setupTestDatabase } from "./support/db";
import { clientSchema } from "@/lib/validation/client";
import { goalSchema } from "@/lib/validation/goal";
import { createClientRecord, deleteClientRecord, getClient, listClients, setClientArchived } from "@/lib/data/clients";
import { exerciseHistory, getSession, lastPerformances, listExercises, listSessions, saveSession } from "@/lib/data/sessions";
import { createGoal, listGoals } from "@/lib/data/goals";
import { goalsDueSoon, recentSessions, sessionsThisWeek } from "@/lib/data/dashboard";
import { createMetric, listMetrics, upsertMetricEntry } from "@/lib/data/metrics";
import { createNote, listNotes } from "@/lib/data/notes";
import { exportAll, getProfile, updateProfile } from "@/lib/data/profile";

const client = (fullName: string) => createClientRecord(clientSchema.parse({ fullName, kind: "personal_training", status: "active" }));
const session = (clientId: string, sessionDate: string, entries: { exerciseName: string; sets: { reps?: number; weight?: number }[] }[]) =>
  saveSession({ clientId, sessionDate, entries }) as Promise<string>;

describe.skipIf(!TEST_DATABASE_URL)("data store", () => {
  setupTestDatabase();

  it("creates, lists, archives and deletes clients", async () => {
    const id = await client("Zed Person");
    await client("amy Person");
    expect((await listClients()).map((c) => c.fullName)).toEqual(["amy Person", "Zed Person"]);
    expect((await getClient(id))?.createdAt).toBeInstanceOf(Date);
    await setClientArchived(id, true);
    expect((await listClients()).map((c) => c.fullName)).toEqual(["amy Person"]);
    expect((await listClients({ archived: true }))[0].archivedAt).toBeInstanceOf(Date);
    expect(await deleteClientRecord(id)).toBe(true);
    expect(await getClient(id)).toBeNull();
  });

  it("saves sessions, reuses exercises case-insensitively and finds the last performance", async () => {
    const id = await client("Lifter");
    await session(id, "2026-10-01", [{ exerciseName: "Back Squat", sets: [{ reps: 8, weight: 100 }] }]);
    const latest = await session(id, "2026-10-08", [
      { exerciseName: "back squat ", sets: [{ reps: 5, weight: 135 }, {}] },
      { exerciseName: "Plank", sets: [{ reps: 1 }] },
    ]);
    expect((await listExercises()).map((e) => [e.name, e.uses])).toEqual([["Back Squat", 2], ["Plank", 1]]);
    expect((await getSession(latest))?.entries[0].sets).toEqual([{ reps: 5, weight: 135 }]);
    expect((await listSessions(id)).map((s) => s.sessionDate)).toEqual(["2026-10-08", "2026-10-01"]);
    expect((await lastPerformances(id))["back squat"]).toMatchObject({ date: "2026-10-08", sets: [{ reps: 5, weight: 135 }] });
    expect((await lastPerformances(id, "2026-10-08"))["back squat"].date).toBe("2026-10-01");
    expect((await exerciseHistory(id)).map((h) => h.date)).toEqual(["2026-10-01", "2026-10-08", "2026-10-08"]);
    expect(await sessionsThisWeek("2026-10-10")).toBe(1);
    expect((await recentSessions())[0]).toMatchObject({ clientName: "Lifter", exerciseCount: 2 });
  });

  it("editing a session replaces its exercises; a session for another client id is not found", async () => {
    const id = await client("Editor");
    const other = await client("Other");
    const sid = await session(id, "2026-10-01", [{ exerciseName: "Row", sets: [{ reps: 10 }] }]);
    expect(await saveSession({ clientId: id, sessionDate: "2026-10-02", entries: [{ exerciseName: "Press", sets: [] }] }, sid)).toBe(sid);
    expect((await getSession(sid))?.entries.map((e) => e.exerciseName)).toEqual(["Press"]);
    expect(await saveSession({ clientId: other, sessionDate: "2026-10-02", entries: [{ exerciseName: "Press", sets: [] }] }, sid)).toBeNull();
  });

  it("computes lift goal progress for the Today screen", async () => {
    const id = await client("Goal Getter");
    await session(id, "2026-09-01", [{ exerciseName: "Deadlift", sets: [{ reps: 5, weight: 100 }] }]);
    await session(id, "2026-10-01", [{ exerciseName: "Deadlift", sets: [{ reps: 5, weight: 150 }] }]);
    await createGoal(id, goalSchema.parse({ kind: "lift", title: "Deadlift 200", exerciseName: "deadlift", targetValue: 200, targetDate: "2026-10-20" }));
    expect((await listGoals(id))[0]).toMatchObject({ exerciseName: "Deadlift", targetValue: 200, status: "active" });
    const [due] = await goalsDueSoon("2026-10-10");
    expect(due).toMatchObject({ clientName: "Goal Getter", percent: 50, achieved: false, daysLeft: 10 });
  });

  it("stores one metric reading per date, and deleting a client removes everything it owns", async () => {
    const id = await client("Measured");
    const m = await createMetric(id, { name: "Waist", unit: "in", direction: "down" });
    await upsertMetricEntry(m, { entryDate: "2026-10-01", value: 34 });
    await upsertMetricEntry(m, { entryDate: "2026-10-01", value: 33.5 });
    expect((await listMetrics(id))[0].entries.map((e) => e.value)).toEqual([33.5]);
    await createNote(id, "First note");
    await session(id, "2026-10-01", [{ exerciseName: "Row", sets: [{ reps: 10 }] }]);
    expect(await listNotes(id)).toHaveLength(1);

    await deleteClientRecord(id);
    const data = await exportAll();
    expect([data.clients, data.sessions, data.sessionEntries, data.metrics, data.metricEntries, data.clientNotes].every((t) => t.length === 0)).toBe(true);
  });

  it("keeps the profile", async () => {
    expect(await getProfile()).toEqual({ displayName: "", timezone: "America/New_York" });
    await updateProfile({ displayName: "Antonia", timezone: "Europe/London" });
    expect(await getProfile()).toEqual({ displayName: "Antonia", timezone: "Europe/London" });
  });
});
