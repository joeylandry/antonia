import "server-only";
import { withDb } from "@/lib/db/client";
import type { ClientNote } from "@/lib/domain/types";

export async function listNotes(clientId: string): Promise<ClientNote[]> {
  return withDb(async (tx) => {
    const rows = await tx<{ id: string; client_id: string; body: string; created_at: Date }[]>`
      select id, client_id, body, created_at from app.client_notes where client_id = ${clientId} order by created_at desc`;
    return rows.map((r) => ({ id: r.id, clientId: r.client_id, body: r.body, createdAt: r.created_at }));
  });
}

export async function createNote(clientId: string, body: string): Promise<string> {
  return withDb(async (tx) => {
    const [row] = await tx<{ id: string }[]>`
      insert into app.client_notes (client_id, body) values (${clientId}, ${body}) returning id`;
    return row.id;
  });
}

export async function updateNote(noteId: string, body: string): Promise<boolean> {
  return withDb(async (tx) => (await tx`update app.client_notes set body = ${body} where id = ${noteId} returning id`).length > 0);
}

export async function deleteNote(noteId: string): Promise<boolean> {
  return withDb(async (tx) => (await tx`delete from app.client_notes where id = ${noteId} returning id`).length > 0);
}
