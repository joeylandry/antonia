import type { Metadata } from "next";
import { SectionHeader } from "@/components/ui/card";
import { ExerciseProgress, type ExerciseHistory } from "@/components/progress/exercise-progress";
import { Measurements } from "@/components/progress/measurements";
import { requireTrainer } from "@/lib/auth";
import { listGoals } from "@/lib/data/goals";
import { listMetrics } from "@/lib/data/metrics";
import { exerciseHistory } from "@/lib/data/sessions";
import { todayIn } from "@/lib/dates";

export const metadata: Metadata = { title: "Progress" };

export default async function ProgressPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const trainer = await requireTrainer();
  const today = todayIn(trainer.timezone);
  const [history, goals, metrics] = await Promise.all([exerciseHistory(trainer.id, id), listGoals(trainer.id, id), listMetrics(trainer.id, id)]);

  const byExercise = new Map<string, ExerciseHistory>();
  for (const h of history) {
    const existing = byExercise.get(h.exerciseId) ?? { exerciseId: h.exerciseId, name: h.exerciseName, entries: [], targets: [] };
    existing.entries.push({ date: h.date, sets: h.sets });
    byExercise.set(h.exerciseId, existing);
  }
  for (const g of goals) {
    if (g.status !== "active" || g.kind !== "lift" || !g.exerciseId || g.targetValue == null) continue;
    byExercise.get(g.exerciseId)?.targets.push({ value: g.targetValue, label: `Goal ${g.targetValue} lb` });
  }
  // Most-logged exercises first.
  const exercises = [...byExercise.values()].sort((a, b) => b.entries.length - a.entries.length || a.name.localeCompare(b.name));

  return (
    <div className="space-y-12">
      <section className="space-y-5">
        <SectionHeader title="Strength & training" description="Pick an exercise to see how it has changed session by session." />
        <ExerciseProgress exercises={exercises} today={today} />
      </section>
      <Measurements clientId={id} items={metrics} today={today} />
    </div>
  );
}
