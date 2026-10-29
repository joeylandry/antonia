import "server-only";
import { getDb, newId, nowIso, tx } from "@/lib/db/client";
import type { Goal, GoalKind, GoalStatus } from "@/lib/domain/types";
import type { GoalInput } from "@/lib/validation/goal";
import { ensureExercise } from "@/lib/data/sessions";

type Row = {
  id: string;
  client_id: string;
  kind: GoalKind;
  title: string;
  exercise_id: string | null;
  exercise_name: string | null;
  target_value: number | null;
  target_date: string | null;
  status: GoalStatus;
  achieved_on: string | null;
};

const map = (r: Row): Goal => ({
  id: r.id,
  clientId: r.client_id,
  kind: r.kind,
  title: r.title,
  exerciseId: r.exercise_id,
  exerciseName: r.exercise_name,
  targetValue: r.target_value,
  targetDate: r.target_date,
  status: r.status,
  achievedOn: r.achieved_on,
});

export async function listGoals(clientId: string): Promise<Goal[]> {
  const rows = getDb()
    .prepare(
      `select g.id, g.client_id, g.kind, g.title, g.exercise_id, x.name as exercise_name,
              g.target_value, g.target_date, g.status, g.achieved_on
       from goals g left join exercises x on x.id = g.exercise_id
       where g.client_id = ?
       order by (g.status = 'active') desc, g.target_date is null, g.target_date, g.created_at`,
    )
    .all(clientId) as Row[];
  return rows.map(map);
}

export async function createGoal(clientId: string, input: GoalInput): Promise<string> {
  return tx((db) => {
    const exId = input.kind === "lift" ? ensureExercise(db, input.exerciseName!) : null;
    const id = newId();
    const now = nowIso();
    db.prepare(
      `insert into goals (id, client_id, kind, title, exercise_id, target_value, target_date, created_at, updated_at)
       values (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(id, clientId, input.kind, input.title, exId, input.kind === "lift" ? (input.targetValue ?? null) : null, input.targetDate ?? null, now, now);
    return id;
  });
}

export async function updateGoal(goalId: string, input: GoalInput): Promise<boolean> {
  return tx((db) => {
    const exId = input.kind === "lift" ? ensureExercise(db, input.exerciseName!) : null;
    const { changes } = db
      .prepare("update goals set kind = ?, title = ?, exercise_id = ?, target_value = ?, target_date = ?, updated_at = ? where id = ?")
      .run(input.kind, input.title, exId, input.kind === "lift" ? (input.targetValue ?? null) : null, input.targetDate ?? null, nowIso(), goalId);
    return changes > 0;
  });
}

export async function setGoalStatus(goalId: string, status: GoalStatus, today: string): Promise<boolean> {
  const { changes } = getDb()
    .prepare("update goals set status = ?, achieved_on = ?, updated_at = ? where id = ?")
    .run(status, status === "achieved" ? today : null, nowIso(), goalId);
  return changes > 0;
}

export async function deleteGoal(goalId: string): Promise<boolean> {
  return getDb().prepare("delete from goals where id = ?").run(goalId).changes > 0;
}
