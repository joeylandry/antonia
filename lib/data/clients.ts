import "server-only";
import { isDemo } from "@/lib/demo/mode";
import * as demo from "@/lib/demo/store";
import type { Tx } from "@/lib/db/client";
import { withTrainer } from "@/lib/db/client";
import type { Client, ClientListItem, ClientKind, ClientStatus } from "@/lib/domain/types";
import type { ClientInput } from "@/lib/validation/client";

type Row = {
  id: string;
  full_name: string;
  kind: ClientKind;
  status: ClientStatus;
  primary_goal: string | null;
  health_notes: string | null;
  email: string | null;
  phone: string | null;
  start_date: string | null;
  assessment_date: string | null;
  next_review_date: string | null;
  last_reviewed_on: string | null;
  session_length_min: number | null;
  sessions_per_week: number | null;
  archived_at: Date | null;
  created_at: Date;
};

export function mapClient(r: Row): Client {
  return {
    id: r.id,
    fullName: r.full_name,
    kind: r.kind,
    status: r.status,
    primaryGoal: r.primary_goal,
    healthNotes: r.health_notes,
    email: r.email,
    phone: r.phone,
    startDate: r.start_date,
    assessmentDate: r.assessment_date,
    nextReviewDate: r.next_review_date,
    lastReviewedOn: r.last_reviewed_on,
    sessionLengthMin: r.session_length_min == null ? null : Number(r.session_length_min),
    sessionsPerWeek: r.sessions_per_week == null ? null : Number(r.sessions_per_week),
    archivedAt: r.archived_at,
    createdAt: r.created_at,
  };
}

export type ClientSort = "name" | "recent" | "review" | "newest";

export async function listClients(
  trainerId: string,
  opts: { archived?: boolean } = {},
): Promise<ClientListItem[]> {
  if (isDemo()) return demo.listClients(opts);
  return withTrainer(trainerId, async (tx) => {
    const rows = await tx<(Row & { last_session_date: string | null; session_count: number; active_goal_count: number })[]>`
      select c.*,
        (select max(s.session_date) from public.sessions s where s.client_id = c.id) as last_session_date,
        (select count(*)::int from public.sessions s where s.client_id = c.id) as session_count,
        (select count(*)::int from public.goals g where g.client_id = c.id and g.status = 'active') as active_goal_count
      from public.clients c
      where ${opts.archived ? tx`c.archived_at is not null` : tx`c.archived_at is null`}
      order by lower(c.full_name)`;
    return rows.map((r) => ({
      ...mapClient(r),
      lastSessionDate: r.last_session_date,
      sessionCount: r.session_count,
      activeGoalCount: r.active_goal_count,
    }));
  });
}

export async function getClient(trainerId: string, id: string): Promise<Client | null> {
  if (isDemo()) return demo.getClient(id);
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  return withTrainer(trainerId, async (tx) => {
    const [row] = await tx<Row[]>`select * from public.clients where id = ${id}`;
    return row ? mapClient(row) : null;
  });
}

function values(input: ClientInput) {
  return {
    full_name: input.fullName,
    kind: input.kind,
    status: input.status,
    primary_goal: input.primaryGoal ?? null,
    health_notes: input.healthNotes ?? null,
    email: input.email ?? null,
    phone: input.phone ?? null,
    start_date: input.startDate ?? null,
    assessment_date: input.assessmentDate ?? null,
    next_review_date: input.nextReviewDate ?? null,
    session_length_min: input.sessionLengthMin ?? null,
    sessions_per_week: input.sessionsPerWeek ?? null,
  };
}

export async function createClientRecord(trainerId: string, input: ClientInput): Promise<string> {
  if (isDemo()) return demo.createClientRecord(input);
  return withTrainer(trainerId, async (tx) => {
    const v = values(input);
    const [row] = await tx<{ id: string }[]>`
      insert into public.clients ${tx({ ...v, trainer_id: trainerId })} returning id`;
    return row.id;
  });
}

export async function updateClientRecord(trainerId: string, id: string, input: ClientInput): Promise<boolean> {
  if (isDemo()) return demo.updateClientRecord(id, input);
  return withTrainer(trainerId, async (tx) => {
    const rows = await tx`update public.clients set ${tx(values(input))} where id = ${id} returning id`;
    return rows.length > 0;
  });
}

export async function setClientArchived(trainerId: string, id: string, archived: boolean): Promise<boolean> {
  if (isDemo()) return demo.setClientArchived(id, archived);
  return withTrainer(trainerId, async (tx) => {
    const rows = await tx`
      update public.clients set archived_at = ${archived ? tx`now()` : null} where id = ${id} returning id`;
    return rows.length > 0;
  });
}

/** Marks a review as done and optionally schedules the next one. */
export async function completeReview(trainerId: string, id: string, today: string, nextReview: string | null): Promise<boolean> {
  if (isDemo()) return demo.completeReview(id, today, nextReview);
  return withTrainer(trainerId, async (tx) => {
    const rows = await tx`
      update public.clients set last_reviewed_on = ${today}, next_review_date = ${nextReview} where id = ${id} returning id`;
    return rows.length > 0;
  });
}

export async function deleteClientRecord(trainerId: string, id: string): Promise<boolean> {
  if (isDemo()) return demo.deleteClientRecord(id);
  return withTrainer(trainerId, async (tx) => {
    const rows = await tx`delete from public.clients where id = ${id} returning id`;
    return rows.length > 0;
  });
}

export type { Tx };
