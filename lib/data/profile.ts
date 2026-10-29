import "server-only";
import { getDb } from "@/lib/db/client";

export async function getProfile(): Promise<{ displayName: string; timezone: string }> {
  const r = getDb().prepare("select display_name, timezone from profile where id = 1").get() as { display_name: string; timezone: string };
  return { displayName: r.display_name, timezone: r.timezone };
}

export async function updateProfile(v: { displayName: string; timezone: string }) {
  getDb().prepare("update profile set display_name = ?, timezone = ? where id = 1").run(v.displayName, v.timezone);
}

/** Everything in the app, for a full-fidelity backup. */
export async function exportAll() {
  const db = getDb();
  const all = (sql: string) => db.prepare(sql).all() as Record<string, unknown>[];
  return {
    exportedAt: new Date().toISOString(),
    schemaVersion: 1,
    clients: all("select * from clients order by full_name"),
    exercises: all("select id, name, created_at from exercises order by name"),
    sessions: all("select * from sessions order by session_date"),
    sessionEntries: all("select * from session_entries order by session_id, position").map((r) => ({ ...r, sets: JSON.parse(String(r.sets)) })),
    goals: all("select * from goals order by created_at"),
    metrics: all("select * from metrics order by created_at"),
    metricEntries: all("select * from metric_entries order by entry_date"),
    clientNotes: all("select * from client_notes order by created_at"),
  };
}
