import "server-only";
import { withTrainer } from "@/lib/db/client";
import type { Goal, GoalKind, GoalStatus } from "@/lib/domain/types";
import type { GoalInput } from "@/lib/validation/goal";

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

export async function listGoals(trainerId: string, clientId: string): Promise<Goal[]> {
  return withTrainer(trainerId, async (tx) => {
    const rows = await tx<Row[]>`
      select g.id, g.client_id, g.kind, g.title, g.exercise_id, x.name as exercise_name,
             g.target_value, g.target_date, g.status, g.achieved_on
      from public.goals g left join public.exercises x on x.id = g.exercise_id
      where g.client_id = ${clientId}
      order by (g.status = 'active') desc, g.target_date nulls last, g.created_at`;
    return rows.map(map);
  });
}

async function exerciseId(tx: Parameters<Parameters<typeof withTrainer>[1]>[0], trainerId: string, name: string) {
  const [row] = await tx<{ id: string }[]>`
    insert into public.exercises (trainer_id, name) values (${trainerId}, ${name.trim()})
    on conflict (trainer_id, name_key) do update set name = public.exercises.name returning id`;
  return row.id;
}

export async function createGoal(trainerId: string, clientId: string, input: GoalInput): Promise<string> {
  return withTrainer(trainerId, async (tx) => {
    const exId = input.kind === "lift" ? await exerciseId(tx, trainerId, input.exerciseName!) : null;
    const [row] = await tx<{ id: string }[]>`
      insert into public.goals (trainer_id, client_id, kind, title, exercise_id, target_value, target_date)
      values (${trainerId}, ${clientId}, ${input.kind}, ${input.title}, ${exId},
              ${input.kind === "lift" ? (input.targetValue ?? null) : null}, ${input.targetDate ?? null})
      returning id`;
    return row.id;
  });
}

export async function updateGoal(trainerId: string, goalId: string, input: GoalInput): Promise<boolean> {
  return withTrainer(trainerId, async (tx) => {
    const exId = input.kind === "lift" ? await exerciseId(tx, trainerId, input.exerciseName!) : null;
    const rows = await tx`
      update public.goals set kind = ${input.kind}, title = ${input.title}, exercise_id = ${exId},
        target_value = ${input.kind === "lift" ? (input.targetValue ?? null) : null}, target_date = ${input.targetDate ?? null}
      where id = ${goalId} returning id`;
    return rows.length > 0;
  });
}

export async function setGoalStatus(trainerId: string, goalId: string, status: GoalStatus, today: string): Promise<boolean> {
  return withTrainer(trainerId, async (tx) => {
    const rows = await tx`
      update public.goals set status = ${status}, achieved_on = ${status === "achieved" ? today : null}
      where id = ${goalId} returning id`;
    return rows.length > 0;
  });
}

export async function deleteGoal(trainerId: string, goalId: string): Promise<boolean> {
  return withTrainer(trainerId, async (tx) => {
    const rows = await tx`delete from public.goals where id = ${goalId} returning id`;
    return rows.length > 0;
  });
}
