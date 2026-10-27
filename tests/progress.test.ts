import { describe, expect, it } from "vitest";
import {
  availableMeasures,
  buildSeries,
  changeOverSeries,
  filterRange,
  goalProgress,
  longestHold,
  summarizeSets,
  topWeight,
  totalReps,
  volume,
} from "@/lib/domain/progress";

describe("set measures", () => {
  const sets = [{ reps: 12, weight: 25 }, { reps: 10, weight: 40 }, { reps: 5, weight: 55 }];
  it("computes top weight, total reps and volume", () => {
    expect(topWeight(sets)).toBe(55);
    expect(totalReps(sets)).toBe(27);
    expect(volume(sets)).toBe(12 * 25 + 10 * 40 + 5 * 55);
  });
  it("returns null when a measure has no data", () => {
    expect(topWeight([{ reps: 8 }])).toBeNull();
    expect(volume([{ reps: 8 }])).toBeNull();
    expect(longestHold([{ reps: 8 }])).toBeNull();
    expect(topWeight([])).toBeNull();
  });
  it("handles timed work", () => {
    expect(longestHold([{ seconds: 20 }, { seconds: 40 }])).toBe(40);
  });
});

describe("summarizeSets", () => {
  it("collapses identical sets", () => {
    expect(summarizeSets([{ reps: 12, weight: 25 }, { reps: 12, weight: 25 }])).toBe("2 × 12 @ 25 lb");
  });
  it("shows ramps", () => {
    expect(summarizeSets([{ reps: 12, weight: 25 }, { reps: 10, weight: 40 }, { reps: 5, weight: 55 }])).toBe("12 → 10 → 5 @ 25 → 40 → 55 lb");
  });
  it("handles holds and empty", () => {
    expect(summarizeSets([{ seconds: 20 }, { seconds: 40 }])).toBe("20 → 40s");
    expect(summarizeSets([])).toBe("—");
    expect(summarizeSets([{ reps: 10 }])).toBe("10");
  });
});

describe("series", () => {
  const history = [
    { date: "2026-10-09", sets: [{ reps: 10, weight: 30 }] },
    { date: "2026-10-06", sets: [{ reps: 12, weight: 25 }] },
    { date: "2026-10-09", sets: [{ reps: 8, weight: 35 }] },
    { date: "2026-10-13", sets: [{ reps: 8 }] },
  ];
  it("is sorted, one point per date, skipping entries without the measure", () => {
    expect(buildSeries(history, "top_weight")).toEqual([
      { date: "2026-10-06", value: 25 },
      { date: "2026-10-09", value: 35 },
    ]);
  });
  it("lists available measures with the best default first", () => {
    expect(availableMeasures(history.map((h) => h.sets))).toEqual(["top_weight", "volume", "total_reps"]);
    expect(availableMeasures([[{ seconds: 30 }]])).toEqual(["hold_time"]);
  });
  it("computes change across the series", () => {
    expect(changeOverSeries([{ date: "a", value: 100 }])).toBeNull();
    expect(changeOverSeries([{ date: "a", value: 100 }, { date: "b", value: 125 }])).toEqual({ delta: 25, pct: 25, from: 100, to: 125 });
  });
  it("filters by range relative to today", () => {
    const pts = [{ date: "2026-06-01" }, { date: "2026-09-20" }, { date: "2026-10-20" }];
    expect(filterRange(pts, "1m", "2026-10-27").map((p) => p.date)).toEqual(["2026-10-20"]);
    expect(filterRange(pts, "3m", "2026-10-27").map((p) => p.date)).toEqual(["2026-09-20", "2026-10-20"]);
    expect(filterRange(pts, "all", "2026-10-27")).toHaveLength(3);
  });
});

describe("goalProgress", () => {
  const series = [{ date: "2026-10-06", value: 100 }, { date: "2026-10-20", value: 140 }];
  it("measures progress from the first logged weight to the target", () => {
    const g = goalProgress({ targetValue: 180, targetDate: "2026-10-31" }, series, "2026-10-27");
    expect(g).toMatchObject({ baseline: 100, current: 140, target: 180, percent: 50, achieved: false, daysLeft: 4 });
  });
  it("marks achieved when the best weight reaches the target", () => {
    const g = goalProgress({ targetValue: 135, targetDate: null }, series, "2026-10-27");
    expect(g).toMatchObject({ achieved: true, percent: 100, daysLeft: null });
  });
  it("reports 0% with no data and negative days when overdue", () => {
    const g = goalProgress({ targetValue: 180, targetDate: "2026-10-01" }, [], "2026-10-27");
    expect(g).toMatchObject({ baseline: null, current: null, percent: 0, daysLeft: -26 });
  });
  it("returns null without a numeric target", () => {
    expect(goalProgress({ targetValue: null, targetDate: null }, series, "2026-10-27")).toBeNull();
  });
});
