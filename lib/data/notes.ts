import "server-only";
import { isDemo } from "@/lib/demo/mode";
import * as demo from "@/lib/demo/store";
import { withTrainer } from "@/lib/db/client";
import type { ClientNote } from "@/lib/domain/types";

export async function listNotes(trainerId: string, clientId: string): Promise<ClientNote[]> {
  if (isDemo()) return demo.listNotes(clientId);
  return withTrainer(trainerId, async (tx) => {
    const rows = await tx<{ id: string; client_id: string; body: string; created_at: Date }[]>`
      select id, client_id, body, created_at from public.client_notes where client_id = ${clientId} order by created_at desc`;
    return rows.map((r) => ({ id: r.id, clientId: r.client_id, body: r.body, createdAt: r.created_at }));
  });
}

export async function createNote(trainerId: string, clientId: string, body: string): Promise<string> {
  if (isDemo()) return demo.createNote(clientId, body);
  return withTrainer(trainerId, async (tx) => {
    const [row] = await tx<{ id: string }[]>`
      insert into public.client_notes (trainer_id, client_id, body) values (${trainerId}, ${clientId}, ${body}) returning id`;
    return row.id;
  });
}

export async function updateNote(trainerId: string, noteId: string, body: string): Promise<boolean> {
  if (isDemo()) return demo.updateNote(noteId, body);
  return withTrainer(trainerId, async (tx) => (await tx`update public.client_notes set body = ${body} where id = ${noteId} returning id`).length > 0);
}

export async function deleteNote(trainerId: string, noteId: string): Promise<boolean> {
  if (isDemo()) return demo.deleteNote(noteId);
  return withTrainer(trainerId, async (tx) => (await tx`delete from public.client_notes where id = ${noteId} returning id`).length > 0);
}
