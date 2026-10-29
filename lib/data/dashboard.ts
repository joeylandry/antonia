import "server-only";
import { getDb } from "@/lib/db/client";
import { addDays } from "@/lib/dates";
import { goalProgress } from "@/lib/domain/progress";

export type RecentSession = { id: string; clientId: string; clientName: string; sessionDate: string; focus: string | null; exerciseCount: number };

export async function recentSessions(limit = 6): Promise<RecentSession[]> {
  const rows = getDb()
    .prepare(
      `select s.id, s.client_id, c.full_name, s.session_date, s.focus,
              (select count(*) from session_entries e where e.session_id = s.id) as exercise_count
       from sessions s join clients c on c.id = s.client_id
       where c.archived_at is null
       order by s.session_date desc, s.created_at desc limit ?`,
    )
    .all(limit) as { id: string; client_id: string; full_name: string; session_date: string; focus: string | null; exercise_count: number }[];
  return rows.map((r) => ({ id: r.id, clientId: r.client_id, clientName: r.full_name, sessionDate: r.session_date, focus: r.focus, exerciseCount: Number(r.exercise_count) }));
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
export async function goalsDueSoon(today: string, withinDays = 21): Promise<GoalDue[]> {
  const until = addDays(today, withinDays);
  const rows = getDb()
    .prepare(
      `select g.id, g.client_id, c.full_name, g.title, g.target_value, g.target_date,
        (select max(cast(json_extract(st.value, '$.weight') as real)) from session_entries e
           join sessions s on s.id = e.session_id, json_each(e.sets) st
          where e.exercise_id = g.exercise_id and s.client_id = g.client_id
            and s.session_date = (select min(s2.session_date) from session_entries e2
                                    join sessions s2 on s2.id = e2.session_id
                                   where e2.exercise_id = g.exercise_id and s2.client_id = g.client_id
                                     and exists (select 1 from json_each(e2.sets) x where cast(json_extract(x.value, '$.weight') as real) > 0))
        ) as first_weight,
        (select max(cast(json_extract(st.value, '$.weight') as real)) from session_entries e
           join sessions s on s.id = e.session_id, json_each(e.sets) st
          where e.exercise_id = g.exercise_id and s.client_id = g.client_id) as best_weight
      from goals g join clients c on c.id = g.client_id
      where g.status = 'active' and g.kind = 'lift' and g.target_date is not null
        and g.target_date <= ? and c.archived_at is null and c.status <> 'inactive'
      order by g.target_date`,
    )
    .all(until) as {
    id: string; client_id: string; full_name: string; title: string; target_value: number; target_date: string;
    first_weight: number | null; best_weight: number | null;
  }[];
  return rows.map((r) => {
    const series = r.first_weight != null ? [{ date: "", value: Number(r.first_weight) }, ...(r.best_weight != null ? [{ date: "", value: Number(r.best_weight) }] : [])] : [];
    const p = goalProgress({ targetValue: r.target_value, targetDate: r.target_date }, series, today)!;
    return { id: r.id, clientId: r.client_id, clientName: r.full_name, title: r.title, targetDate: r.target_date, percent: p.percent, achieved: p.achieved, daysLeft: p.daysLeft ?? 0 };
  });
}

export async function sessionsThisWeek(today: string): Promise<number> {
  const r = getDb()
    .prepare(
      `select count(*) as n from sessions s join clients c on c.id = s.client_id
       where c.archived_at is null and s.session_date > ? and s.session_date <= ?`,
    )
    .get(addDays(today, -7), today) as { n: number };
  return Number(r.n);
}
