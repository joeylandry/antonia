import type { Metadata } from "next";
import { Target } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { SectionHeader } from "@/components/ui/card";
import { AddGoalButton } from "@/components/goals/add-goal-button";
import { GoalCard } from "@/components/goals/goal-card";
import { progressByGoal } from "@/components/sessions/goal-data";
import { requireTrainer } from "@/lib/auth";
import { listGoals } from "@/lib/data/goals";
import { exerciseHistory, listExercises } from "@/lib/data/sessions";
import { todayIn } from "@/lib/dates";

export const metadata: Metadata = { title: "Goals" };

export default async function GoalsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const trainer = await requireTrainer();
  const today = todayIn(trainer.timezone);
  const [goals, history, exercises] = await Promise.all([listGoals(id), exerciseHistory(id), listExercises()]);
  const progress = progressByGoal(goals, history, today);
  const exerciseNames = exercises.map((e) => e.name);
  const active = goals.filter((g) => g.status === "active");
  const closed = goals.filter((g) => g.status !== "active");

  return (
    <div className="space-y-8">
      <SectionHeader
        title="Goals"
        description="Lift targets update automatically as you log sessions."
        action={<AddGoalButton clientId={id} exerciseNames={exerciseNames} />}
      />
      {goals.length === 0 ? (
        <EmptyState
          icon={<Target />}
          title="No goals yet"
          description="Set a target like “Squat 180 lb by the end of October” and watch progress toward it build with every session."
          action={<AddGoalButton clientId={id} exerciseNames={exerciseNames} label="Add the first goal" />}
        />
      ) : (
        <>
          {active.length > 0 && (
            <ul className="space-y-3">
              {active.map((g) => (
                <GoalCard key={g.id} goal={g} progress={progress[g.id]} exerciseNames={exerciseNames} today={today} />
              ))}
            </ul>
          )}
          {closed.length > 0 && (
            <section className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground">Achieved & closed</h3>
              <ul className="space-y-3">
                {closed.map((g) => (
                  <GoalCard key={g.id} goal={g} progress={progress[g.id]} exerciseNames={exerciseNames} today={today} />
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}
