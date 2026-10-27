"use client";

import { useMemo, useState } from "react";
import { TrendingUp } from "lucide-react";
import { Select } from "@/components/ui/input";
import { EmptyState } from "@/components/empty-state";
import { TrendChart } from "@/components/charts/trend-chart";
import { RangeTabs } from "./range-tabs";
import { Stat } from "./stat";
import { formatDate } from "@/lib/dates";
import {
  MEASURE_LABELS,
  availableMeasures,
  buildSeries,
  changeOverSeries,
  filterRange,
  summarizeSets,
  type ExerciseMeasure,
  type RangeKey,
} from "@/lib/domain/progress";
import type { SetEntry } from "@/lib/domain/types";
import { cn } from "@/lib/utils";

export type ExerciseHistory = {
  exerciseId: string;
  name: string;
  entries: { date: string; sets: SetEntry[] }[];
  /** Active lift goals on this exercise. */
  targets: { value: number; label: string }[];
};

export function ExerciseProgress({ exercises, today }: { exercises: ExerciseHistory[]; today: string }) {
  const [selectedId, setSelectedId] = useState(exercises[0]?.exerciseId ?? "");
  const [measureChoice, setMeasureChoice] = useState<ExerciseMeasure | null>(null);
  const [range, setRange] = useState<RangeKey>("all");

  const exercise = exercises.find((e) => e.exerciseId === selectedId) ?? exercises[0];
  const measures = useMemo(() => (exercise ? availableMeasures(exercise.entries.map((e) => e.sets)) : []), [exercise]);
  const measure = measureChoice && measures.includes(measureChoice) ? measureChoice : measures[0];

  if (!exercise || !measure) {
    return (
      <EmptyState
        icon={<TrendingUp />}
        title="Nothing to chart yet"
        description="Once you log sessions with weights, reps or timed holds, each exercise's progress shows up here."
      />
    );
  }

  const full = buildSeries(exercise.entries, measure);
  const points = filterRange(full, range, today);
  const change = changeOverSeries(points);
  const { label, unit } = MEASURE_LABELS[measure];
  const best = points.length ? Math.max(...points.map((p) => p.value)) : null;
  const latest = points.at(-1);
  const targets = measure === "top_weight" ? exercise.targets : [];

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Select
            aria-label="Exercise"
            value={exercise.exerciseId}
            onChange={(e) => {
              setSelectedId(e.target.value);
              setMeasureChoice(null);
            }}
            className="w-full sm:w-64"
          >
            {exercises.map((e) => (
              <option key={e.exerciseId} value={e.exerciseId}>
                {e.name}
              </option>
            ))}
          </Select>
          {measures.length > 1 && (
            <div role="group" aria-label="Measure" className="inline-flex rounded-md border border-border bg-muted p-0.5">
              {measures.map((m) => (
                <button
                  key={m}
                  type="button"
                  aria-pressed={m === measure}
                  onClick={() => setMeasureChoice(m)}
                  className={cn(
                    "rounded-[5px] px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground",
                    m === measure && "bg-surface text-foreground shadow-sm",
                  )}
                >
                  {MEASURE_LABELS[m].label}
                </button>
              ))}
            </div>
          )}
        </div>
        <RangeTabs value={range} onChange={setRange} />
      </div>

      {points.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border-strong py-12 text-center text-sm text-muted-foreground">
          No {label.toLowerCase()} logged in this date range.
        </p>
      ) : (
        <>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
            <Stat label="Latest" value={`${latest!.value}`} sub={unit} />
            <Stat label="Best" value={`${best}`} sub={unit} />
            <Stat label="First logged" value={`${points[0].value}`} sub={unit} />
            <Stat
              label="Change"
              value={change ? `${change.delta > 0 ? "+" : ""}${change.delta}` : "—"}
              sub={change ? `${unit}${change.pct != null ? ` · ${change.pct > 0 ? "+" : ""}${change.pct}%` : ""}` : "need 2+ sessions"}
              tone={change ? (change.delta > 0 ? "good" : change.delta < 0 ? "bad" : "neutral") : "neutral"}
            />
          </dl>

          <div className="rounded-lg border border-border bg-surface p-3 pt-4 shadow-sm sm:p-4">
            <TrendChart
              points={points}
              unit={unit}
              targets={targets}
              ariaLabel={`${label} for ${exercise.name} over time. ${points.length} sessions from ${formatDate(points[0].date)} to ${formatDate(points.at(-1)!.date)}.`}
            />
          </div>

          <details className="group rounded-lg border border-border">
            <summary className="cursor-pointer list-none px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground [&::-webkit-details-marker]:hidden">
              View the data
            </summary>
            <div className="overflow-x-auto border-t border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted-foreground">
                    <th className="px-4 py-2 font-medium">Date</th>
                    <th className="px-4 py-2 font-medium">{label}</th>
                    <th className="px-4 py-2 font-medium">Sets</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {[...exercise.entries]
                    .filter((e) => points.some((p) => p.date === e.date))
                    .reverse()
                    .map((e, i) => {
                      const p = points.find((x) => x.date === e.date)!;
                      return (
                        <tr key={`${e.date}-${i}`}>
                          <td className="px-4 py-2">{formatDate(e.date)}</td>
                          <td className="tabular px-4 py-2">
                            {p.value} {unit}
                          </td>
                          <td className="tabular px-4 py-2 text-muted-foreground">{summarizeSets(e.sets)}</td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </details>
        </>
      )}
    </div>
  );
}
