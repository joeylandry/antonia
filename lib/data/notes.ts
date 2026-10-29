import "server-only";
import { getDb, newId, nowIso } from "@/lib/db/client";
import type { ClientNote } from "@/lib/domain/types";

export async function listNotes(clientId: string): Promise<ClientNote[]> {
  const rows = getDb()
    .prepare("select id, client_id, body, created_at from client_notes where client_id = ? order by created_at desc")
    .all(clientId) as { id: string; client_id: string; body: string; created_at: string }[];
  return rows.map((r) => ({ id: r.id, clientId: r.client_id, body: r.body, createdAt: new Date(r.created_at) }));
}

export async function createNote(clientId: string, body: string): Promise<string> {
  const id = newId();
  const now = nowIso();
  getDb().prepare("insert into client_notes (id, client_id, body, created_at, updated_at) values (?, ?, ?, ?, ?)").run(id, clientId, body, now, now);
  return id;
}

export async function updateNote(noteId: string, body: string): Promise<boolean> {
  return getDb().prepare("update client_notes set body = ?, updated_at = ? where id = ?").run(body, nowIso(), noteId).changes > 0;
}

export async function deleteNote(noteId: string): Promise<boolean> {
  return getDb().prepare("delete from client_notes where id = ?").run(noteId).changes > 0;
}
