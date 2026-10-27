import "server-only";
import { isDemo } from "@/lib/demo/mode";
import * as demo from "@/lib/demo/store";
import { withTrainer } from "@/lib/db/client";
import { addDays } from "@/lib/dates";
import { goalProgress } from "@/lib/domain/progress";

export type RecentSession = { id: string; clientId: string; clientName: string; sessionDate: string; focus: string | null; exerciseCount: number };

export async function recentSessions(trainerId: string, limit = 6): Promise<RecentSession[]> {
  if (isDemo()) return demo.recentSessions(limit);
  return withTrainer(trainerId, async (tx) => {
    const rows = await tx<{ id: string; client_id: string; full_name: string; session_date: string; focus: string | null; exercise_count: number }[]>`
      select s.id, s.client_id, c.full_name, s.session_date, s.focus,
             (select count(*)::int from public.session_entries e where e.session_id = s.id) as exercise_count
      from public.sessions s join public.clients c on c.id = s.client_id
      where c.archived_at is null
      order by s.session_date desc, s.created_at desc limit ${limit}`;
    return rows.map((r) => ({ id: r.id, clientId: r.client_id, clientName: r.full_name, sessionDate: r.session_date, focus: r.focus, exerciseCount: r.exercise_count }));
  });
}

export type GoalDue = {
  id: string;
  clientId: string;
  clientName: string;
  title: string;
  targetDate: string;
  percent: number;
  achieved: boolean;
  daysLeft: number;
};

/** Active lift goals due within `withinDays` (or already overdue), with progress. */
export async function goalsDueSoon(trainerId: string, today: string, withinDays = 21): Promise<GoalDue[]> {
  if (isDemo()) return demo.goalsDueSoon(today, withinDays);
  const until = addDays(today, withinDays);
  return withTrainer(trainerId, async (tx) => {
    const rows = await tx<{
      id: string; client_id: string; full_name: string; title: string; target_value: number; target_date: string;
      first_weight: number | null; best_weight: number | null;
    }[]>`
      select g.id, g.client_id, c.full_name, g.title, g.target_value, g.target_date,
        (select max((st->>'weight')::numeric) from public.session_entries e
           join public.sessions s on s.id = e.session_id, jsonb_array_elements(e.sets) st
          where e.exercise_id = g.exercise_id and s.client_id = g.client_id
            and s.session_date = (select min(s2.session_date) from public.session_entries e2
                                    join public.sessions s2 on s2.id = e2.session_id
                                   where e2.exercise_id = g.exercise_id and s2.client_id = g.client_id
                                     and exists (select 1 from jsonb_array_elements(e2.sets) x where (x->>'weight')::numeric > 0))
        ) as first_weight,
        (select max((st->>'weight')::numeric) from public.session_entries e
           join public.sessions s on s.id = e.session_id, jsonb_array_elements(e.sets) st
          where e.exercise_id = g.exercise_id and s.client_id = g.client_id) as best_weight
      from public.goals g join public.clients c on c.id = g.client_id
      where g.status = 'active' and g.kind = 'lift' and g.target_date is not null
        and g.target_date <= ${until} and c.archived_at is null and c.status <> 'inactive'
      order by g.target_date`;
    return rows.map((r) => {
      const series = r.first_weight != null ? [{ date: "", value: Number(r.first_weight) }, ...(r.best_weight != null ? [{ date: "", value: Number(r.best_weight) }] : [])] : [];
      const p = goalProgress({ targetValue: r.target_value, targetDate: r.target_date }, series, today)!;
      return { id: r.id, clientId: r.client_id, clientName: r.full_name, title: r.title, targetDate: r.target_date, percent: p.percent, achieved: p.achieved, daysLeft: p.daysLeft ?? 0 };
    });
  });
}

export async function sessionsThisWeek(trainerId: string, today: string): Promise<number> {
  if (isDemo()) return demo.sessionsThisWeek(today);
  return withTrainer(trainerId, async (tx) => {
    const [r] = await tx<{ n: number }[]>`
      select count(*)::int as n from public.sessions s join public.clients c on c.id = s.client_id
      where c.archived_at is null and s.session_date > ${addDays(today, -7)} and s.session_date <= ${today}`;
    return r.n;
  });
}
