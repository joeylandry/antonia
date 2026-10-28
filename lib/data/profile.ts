import "server-only";
import { withTrainer } from "@/lib/db/client";

export async function updateProfile(trainerId: string, v: { displayName: string; timezone: string }) {
  await withTrainer(trainerId, (tx) => tx`update public.trainers set display_name = ${v.displayName}, timezone = ${v.timezone} where id = ${trainerId}`);
}

/** Everything the trainer owns, for a full-fidelity backup. Row Level Security limits this to their own rows. */
export async function exportAll(trainerId: string) {
  return withTrainer(trainerId, async (tx) => {
    const [clients, exercises, sessions, entries, goals, metrics, metricEntries, notes] = await Promise.all([
      tx`select * from public.clients order by full_name`,
      tx`select id, name, created_at from public.exercises order by name`,
      tx`select * from public.sessions order by session_date`,
      tx`select * from public.session_entries order by session_id, position`,
      tx`select * from public.goals order by created_at`,
      tx`select * from public.metrics order by created_at`,
      tx`select * from public.metric_entries order by entry_date`,
      tx`select * from public.client_notes order by created_at`,
    ]);
    const strip = <T extends Record<string, unknown>>(rows: T[]) =>
      rows.map((row) => {
        const rest: Record<string, unknown> = { ...row };
        delete rest.trainer_id;
        return rest;
      });
    return {
      exportedAt: new Date().toISOString(),
      schemaVersion: 1,
      clients: strip(clients),
      exercises,
      sessions: strip(sessions),
      sessionEntries: strip(entries),
      goals: strip(goals),
      metrics: strip(metrics),
      metricEntries: strip(metricEntries),
      clientNotes: strip(notes),
    };
  });
}
