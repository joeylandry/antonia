import "server-only";
import { isDemo } from "@/lib/demo/mode";
import * as demo from "@/lib/demo/store";
import { withTrainer } from "@/lib/db/client";
import type { Metric, MetricEntry } from "@/lib/domain/types";

export async function listMetrics(trainerId: string, clientId: string): Promise<{ metric: Metric; entries: MetricEntry[] }[]> {
  if (isDemo()) return demo.listMetrics(clientId);
  return withTrainer(trainerId, async (tx) => {
    const metrics = await tx<{ id: string; client_id: string; name: string; unit: string; direction: Metric["direction"] }[]>`
      select id, client_id, name, unit, direction from public.metrics where client_id = ${clientId} order by created_at`;
    if (!metrics.length) return [];
    const entries = await tx<{ id: string; metric_id: string; entry_date: string; value: number; note: string | null }[]>`
      select id, metric_id, entry_date, value, note from public.metric_entries
      where metric_id in ${tx(metrics.map((m) => m.id))} order by entry_date`;
    return metrics.map((m) => ({
      metric: { id: m.id, clientId: m.client_id, name: m.name, unit: m.unit, direction: m.direction },
      entries: entries
        .filter((e) => e.metric_id === m.id)
        .map((e) => ({ id: e.id, metricId: e.metric_id, entryDate: e.entry_date, value: e.value, note: e.note })),
    }));
  });
}

export async function createMetric(trainerId: string, clientId: string, v: { name: string; unit: string; direction: string }): Promise<string> {
  if (isDemo()) return demo.createMetric(clientId, v);
  return withTrainer(trainerId, async (tx) => {
    const [row] = await tx<{ id: string }[]>`
      insert into public.metrics (trainer_id, client_id, name, unit, direction)
      values (${trainerId}, ${clientId}, ${v.name}, ${v.unit}, ${v.direction}) returning id`;
    return row.id;
  });
}

export async function deleteMetric(trainerId: string, metricId: string): Promise<boolean> {
  if (isDemo()) return demo.deleteMetric(metricId);
  return withTrainer(trainerId, async (tx) => (await tx`delete from public.metrics where id = ${metricId} returning id`).length > 0);
}

/** One reading per metric per date; saving the same date again corrects it. */
export async function upsertMetricEntry(trainerId: string, metricId: string, v: { entryDate: string; value: number; note?: string }): Promise<boolean> {
  if (isDemo()) return demo.upsertMetricEntry(metricId, v);
  return withTrainer(trainerId, async (tx) => {
    const [m] = await tx`select id from public.metrics where id = ${metricId}`;
    if (!m) return false;
    await tx`
      insert into public.metric_entries (trainer_id, metric_id, entry_date, value, note)
      values (${trainerId}, ${metricId}, ${v.entryDate}, ${v.value}, ${v.note ?? null})
      on conflict (metric_id, entry_date) do update set value = excluded.value, note = excluded.note`;
    return true;
  });
}

export async function deleteMetricEntry(trainerId: string, entryId: string): Promise<boolean> {
  if (isDemo()) return demo.deleteMetricEntry(entryId);
  return withTrainer(trainerId, async (tx) => (await tx`delete from public.metric_entries where id = ${entryId} returning id`).length > 0);
}
