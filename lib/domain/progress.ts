import { addDays, daysBetween } from "@/lib/dates";
import type { Goal, SetEntry } from "./types";

/** What a progress chart plots for an exercise. */
export type ExerciseMeasure = "top_weight" | "volume" | "total_reps" | "hold_time";

export const MEASURE_LABELS: Record<ExerciseMeasure, { label: string; unit: string }> = {
  top_weight: { label: "Top weight", unit: "lb" },
  volume: { label: "Total volume", unit: "lb" },
  total_reps: { label: "Total reps", unit: "reps" },
  hold_time: { label: "Longest hold", unit: "sec" },
};

export const topWeight = (sets: SetEntry[]): number | null => {
  const w = sets.map((s) => s.weight).filter((x): x is number => typeof x === "number" && x > 0);
  return w.length ? Math.max(...w) : null;
};

export const totalReps = (sets: SetEntry[]): number | null => {
  const r = sets.map((s) => s.reps).filter((x): x is number => typeof x === "number");
  return r.length ? r.reduce((a, b) => a + b, 0) : null;
};

export const volume = (sets: SetEntry[]): number | null => {
  const parts = sets.filter((s) => typeof s.weight === "number" && typeof s.reps === "number").map((s) => s.weight! * s.reps!);
  return parts.length ? Math.round(parts.reduce((a, b) => a + b, 0) * 10) / 10 : null;
};

export const longestHold = (sets: SetEntry[]): number | null => {
  const t = sets.map((s) => s.seconds).filter((x): x is number => typeof x === "number" && x > 0);
  return t.length ? Math.max(...t) : null;
};

export function measureValue(sets: SetEntry[], measure: ExerciseMeasure): number | null {
  switch (measure) {
    case "top_weight":
      return topWeight(sets);
    case "volume":
      return volume(sets);
    case "total_reps":
      return totalReps(sets);
    case "hold_time":
      return longestHold(sets);
  }
}

/** Measures that have at least one data point in the given history, best default first. */
export function availableMeasures(history: SetEntry[][]): ExerciseMeasure[] {
  const has = (m: ExerciseMeasure) => history.some((sets) => measureValue(sets, m) != null);
  const out: ExerciseMeasure[] = [];
  if (has("top_weight")) out.push("top_weight");
  if (has("volume")) out.push("volume");
  if (has("hold_time")) out.push("hold_time");
  if (has("total_reps")) out.push("total_reps");
  return out;
}

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100));

/** "2 × 12 @ 25 lb", "12 → 10 → 5 @ 25 → 55 lb", "3 × 40s" ... */
export function summarizeSets(sets: SetEntry[]): string {
  if (sets.length === 0) return "—";
  const key = (s: SetEntry) => `${s.reps ?? ""}|${s.weight ?? ""}|${s.seconds ?? ""}`;
  const uniform = sets.every((s) => key(s) === key(sets[0]));
  const one = (s: SetEntry) => {
    const bits: string[] = [];
    if (s.reps != null) bits.push(`${s.reps}`);
    if (s.seconds != null) bits.push(`${s.seconds}s`);
    let text = bits.join(" · ");
    if (s.weight != null) text += `${text ? " @ " : ""}${fmt(s.weight)} lb`;
    return text || "done";
  };
  if (uniform) return sets.length > 1 ? `${sets.length} × ${one(sets[0])}` : one(sets[0]);
  // Varying sets: list reps and weights as ramps when they change.
  const reps = sets.map((s) => s.reps).filter((x): x is number => x != null);
  const weights = sets.map((s) => s.weight).filter((x): x is number => x != null);
  const secs = sets.map((s) => s.seconds).filter((x): x is number => x != null);
  const parts: string[] = [];
  if (reps.length) parts.push(reps.join(" → "));
  if (secs.length) parts.push(`${secs.join(" → ")}s`);
  let text = parts.join(" · ");
  if (weights.length) {
    const w = weights.every((x) => x === weights[0]) ? fmt(weights[0]) : weights.map(fmt).join(" → ");
    text += `${text ? " @ " : ""}${w} lb`;
  }
  return text;
}

export type SeriesPoint = { date: string; value: number };

/** One point per session date (the highest value if an exercise appears twice on a date). */
export function buildSeries(history: { date: string; sets: SetEntry[] }[], measure: ExerciseMeasure): SeriesPoint[] {
  const byDate = new Map<string, number>();
  for (const h of history) {
    const v = measureValue(h.sets, measure);
    if (v == null) continue;
    byDate.set(h.date, Math.max(byDate.get(h.date) ?? -Infinity, v));
  }
  return [...byDate.entries()].map(([date, value]) => ({ date, value })).sort((a, b) => a.date.localeCompare(b.date));
}

export type RangeKey = "1m" | "3m" | "6m" | "all";
export const RANGES: { key: RangeKey; label: string; days: number | null }[] = [
  { key: "1m", label: "1M", days: 30 },
  { key: "3m", label: "3M", days: 91 },
  { key: "6m", label: "6M", days: 182 },
  { key: "all", label: "All", days: null },
];

export function filterRange<T extends { date: string }>(points: T[], range: RangeKey, today: string): T[] {
  const days = RANGES.find((r) => r.key === range)?.days;
  if (days == null) return points;
  const from = addDays(today, -days);
  return points.filter((p) => p.date >= from);
}

export type Change = { delta: number; pct: number | null; from: number; to: number };

/** Change from the first to the last point. Null when there are fewer than two points. */
export function changeOverSeries(points: SeriesPoint[]): Change | null {
  if (points.length < 2) return null;
  const from = points[0].value;
  const to = points[points.length - 1].value;
  return { delta: Math.round((to - from) * 100) / 100, pct: from !== 0 ? Math.round(((to - from) / Math.abs(from)) * 1000) / 10 : null, from, to };
}

export type GoalProgress = {
  baseline: number | null;
  current: number | null;
  target: number;
  /** 0-100 */
  percent: number;
  achieved: boolean;
  /** negative = past due, positive = days remaining, null = no date */
  daysLeft: number | null;
};

/**
 * Progress toward a lift goal: how far the best logged top weight has moved from
 * the first logged weight toward the target. `series` is the exercise's top-weight
 * history. The goal's creation does not change the baseline; it is the first session.
 */
export function goalProgress(goal: Pick<Goal, "targetValue" | "targetDate">, series: SeriesPoint[], today: string): GoalProgress | null {
  if (goal.targetValue == null) return null;
  const target = goal.targetValue;
  const baseline = series.length ? series[0].value : null;
  const current = series.length ? Math.max(...series.map((p) => p.value)) : null;
  const achieved = current != null && current >= target;
  let percent = 0;
  if (achieved) percent = 100;
  else if (baseline != null && current != null && target > baseline) {
    percent = Math.max(0, Math.min(100, ((current - baseline) / (target - baseline)) * 100));
  }
  return {
    baseline,
    current,
    target,
    percent: Math.round(percent),
    achieved,
    daysLeft: goal.targetDate ? daysBetween(today, goal.targetDate) : null,
  };
}
