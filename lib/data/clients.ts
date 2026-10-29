import "server-only";
import { getDb, newId, nowIso } from "@/lib/db/client";
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
  archived_at: string | null;
  created_at: string;
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
    archivedAt: r.archived_at ? new Date(r.archived_at) : null,
    createdAt: new Date(r.created_at),
  };
}

export type ClientSort = "name" | "recent" | "review" | "newest";

export async function listClients(opts: { archived?: boolean } = {}): Promise<ClientListItem[]> {
  const rows = getDb()
    .prepare(
      `select c.*,
        (select max(s.session_date) from sessions s where s.client_id = c.id) as last_session_date,
        (select count(*) from sessions s where s.client_id = c.id) as session_count,
        (select count(*) from goals g where g.client_id = c.id and g.status = 'active') as active_goal_count
      from clients c
      where c.archived_at is ${opts.archived ? "not null" : "null"}
      order by lower(c.full_name)`,
    )
    .all() as (Row & { last_session_date: string | null; session_count: number; active_goal_count: number })[];
  return rows.map((r) => ({
    ...mapClient(r),
    lastSessionDate: r.last_session_date,
    sessionCount: Number(r.session_count),
    activeGoalCount: Number(r.active_goal_count),
  }));
}

export async function getClient(id: string): Promise<Client | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const row = getDb().prepare("select * from clients where id = ?").get(id) as Row | undefined;
  return row ? mapClient(row) : null;
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

const COLUMNS = Object.keys(values({} as ClientInput));

export async function createClientRecord(input: ClientInput): Promise<string> {
  const id = newId();
  const now = nowIso();
  const v = values(input);
  getDb()
    .prepare(
      `insert into clients (id, ${COLUMNS.join(", ")}, created_at, updated_at)
       values (?, ${COLUMNS.map(() => "?").join(", ")}, ?, ?)`,
    )
    .run(id, ...Object.values(v), now, now);
  return id;
}

export async function updateClientRecord(id: string, input: ClientInput): Promise<boolean> {
  const v = values(input);
  const { changes } = getDb()
    .prepare(`update clients set ${COLUMNS.map((c) => `${c} = ?`).join(", ")}, updated_at = ? where id = ?`)
    .run(...Object.values(v), nowIso(), id);
  return changes > 0;
}

export async function setClientArchived(id: string, archived: boolean): Promise<boolean> {
  const { changes } = getDb()
    .prepare("update clients set archived_at = ?, updated_at = ? where id = ?")
    .run(archived ? nowIso() : null, nowIso(), id);
  return changes > 0;
}

/** Marks a review as done and optionally schedules the next one. */
export async function completeReview(id: string, today: string, nextReview: string | null): Promise<boolean> {
  const { changes } = getDb()
    .prepare("update clients set last_reviewed_on = ?, next_review_date = ?, updated_at = ? where id = ?")
    .run(today, nextReview, nowIso(), id);
  return changes > 0;
}

export async function deleteClientRecord(id: string): Promise<boolean> {
  return getDb().prepare("delete from clients where id = ?").run(id).changes > 0;
}
