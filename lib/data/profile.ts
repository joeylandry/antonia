import "server-only";
import { withDb } from "@/lib/db/client";

export async function getProfile(): Promise<{ displayName: string; timezone: string }> {
  return withDb(async (tx) => {
    const [r] = await tx<{ display_name: string; timezone: string }[]>`select display_name, timezone from app.profile where id = 1`;
    return { displayName: r.display_name, timezone: r.timezone };
  });
}

export async function updateProfile(v: { displayName: string; timezone: string }) {
  await withDb((tx) => tx`update app.profile set display_name = ${v.displayName}, timezone = ${v.timezone} where id = 1`);
}

/** Everything in the app, for a full-fidelity backup. */
export async function exportAll() {
  return withDb(async (tx) => {
    const [clients, exercises, sessions, sessionEntries, goals, metrics, metricEntries, clientNotes] = await Promise.all([
      tx`select * from app.clients order by full_name`,
      tx`select id, name, created_at from app.exercises order by name`,
      tx`select * from app.sessions order by session_date`,
      tx`select * from app.session_entries order by session_id, position`,
      tx`select * from app.goals order by created_at`,
      tx`select * from app.metrics order by created_at`,
      tx`select * from app.metric_entries order by entry_date`,
      tx`select * from app.client_notes order by created_at`,
    ]);
    return { exportedAt: new Date().toISOString(), schemaVersion: 1, clients, exercises, sessions, sessionEntries, goals, metrics, metricEntries, clientNotes };
  });
}
