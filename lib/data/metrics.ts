import "server-only";
import { getDb, newId, nowIso } from "@/lib/db/client";
import type { Metric, MetricEntry } from "@/lib/domain/types";

export async function listMetrics(clientId: string): Promise<{ metric: Metric; entries: MetricEntry[] }[]> {
  const db = getDb();
  const metrics = db
    .prepare("select id, client_id, name, unit, direction from metrics where client_id = ? order by created_at")
    .all(clientId) as { id: string; client_id: string; name: string; unit: string; direction: Metric["direction"] }[];
  if (!metrics.length) return [];
  const entries = db
    .prepare(
      `select e.id, e.metric_id, e.entry_date, e.value, e.note from metric_entries e
       join metrics m on m.id = e.metric_id where m.client_id = ? order by e.entry_date`,
    )
    .all(clientId) as { id: string; metric_id: string; entry_date: string; value: number; note: string | null }[];
  return metrics.map((m) => ({
    metric: { id: m.id, clientId: m.client_id, name: m.name, unit: m.unit, direction: m.direction },
    entries: entries
      .filter((e) => e.metric_id === m.id)
      .map((e) => ({ id: e.id, metricId: e.metric_id, entryDate: e.entry_date, value: e.value, note: e.note })),
  }));
}

export async function createMetric(clientId: string, v: { name: string; unit: string; direction: string }): Promise<string> {
  const id = newId();
  getDb()
    .prepare("insert into metrics (id, client_id, name, unit, direction, created_at) values (?, ?, ?, ?, ?, ?)")
    .run(id, clientId, v.name, v.unit, v.direction, nowIso());
  return id;
}

export async function deleteMetric(metricId: string): Promise<boolean> {
  return getDb().prepare("delete from metrics where id = ?").run(metricId).changes > 0;
}

/** One reading per metric per date; saving the same date again corrects it. */
export async function upsertMetricEntry(metricId: string, v: { entryDate: string; value: number; note?: string }): Promise<boolean> {
  const db = getDb();
  if (!db.prepare("select id from metrics where id = ?").get(metricId)) return false;
  db.prepare(
    `insert into metric_entries (id, metric_id, entry_date, value, note, created_at) values (?, ?, ?, ?, ?, ?)
     on conflict (metric_id, entry_date) do update set value = excluded.value, note = excluded.note`,
  ).run(newId(), metricId, v.entryDate, v.value, v.note ?? null, nowIso());
  return true;
}

export async function deleteMetricEntry(entryId: string): Promise<boolean> {
  return getDb().prepare("delete from metric_entries where id = ?").run(entryId).changes > 0;
}
