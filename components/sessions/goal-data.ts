import "server-only";
import { buildSeries, goalProgress, type GoalProgress } from "@/lib/domain/progress";
import type { Goal } from "@/lib/domain/types";
import type { HistoryRow } from "@/lib/data/sessions";

/** Progress for each lift goal, from the client's logged top weights. */
export function progressByGoal(goals: Goal[], history: HistoryRow[], today: string): Record<string, GoalProgress | null> {
  const out: Record<string, GoalProgress | null> = {};
  for (const g of goals) {
    if (g.kind !== "lift" || !g.exerciseId) {
      out[g.id] = null;
      continue;
    }
    const series = buildSeries(history.filter((h) => h.exerciseId === g.exerciseId), "top_weight");
    out[g.id] = goalProgress(g, series, today);
  }
  return out;
}
