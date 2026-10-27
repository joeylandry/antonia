"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Pencil, StickyNote, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/empty-state";
import { FormBanner } from "@/components/forms/form-banner";
import { deleteNoteAction, saveNoteAction } from "@/app/(app)/clients/[id]/actions";
import type { ClientNote } from "@/lib/domain/types";
import type { ActionState } from "@/lib/validation/shared";


function when(d: Date, tz: string) {
  return new Intl.DateTimeFormat("en-US", { timeZone: tz, month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(d));
}

export function NotesPanel({ clientId, notes, timeZone }: { clientId: string; notes: ClientNote[]; timeZone: string }) {
  return (
    <div className="space-y-6">
      <NoteForm clientId={clientId} />
      {notes.length === 0 ? (
        <EmptyState icon={<StickyNote />} title="No notes yet" description="Keep context that doesn't belong in a workout: preferences, life events, things to follow up on." />
      ) : (
        <ul className="space-y-3">
          {notes.map((n) => (
            <NoteItem key={n.id} clientId={clientId} note={n} timeZone={timeZone} />
          ))}
        </ul>
      )}
    </div>
  );
}

function NoteForm({ clientId }: { clientId: string }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, setState] = useState<ActionState>({});
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await saveNoteAction(clientId, null, {}, formData);
      setState(result);
      if (result.ok) {
        formRef.current?.reset();
        toast.success("Note added");
        router.refresh();
      }
    });
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} className="space-y-2" noValidate>
      {state.error && <FormBanner tone="error">{state.error}</FormBanner>}
      <label htmlFor="new-note" className="sr-only">
        New note
      </label>
      <Textarea id="new-note" name="body" rows={3} placeholder="Add a note…" maxLength={5000} aria-invalid={!!state.fieldErrors?.body} />
      {state.fieldErrors?.body && (
        <p role="alert" className="text-xs text-danger">
          {state.fieldErrors.body}
        </p>
      )}
      <div className="flex justify-end">
        <Button type="submit" size="sm" loading={pending}>
          Add note
        </Button>
      </div>
    </form>
  );
}

function NoteItem({ clientId, note, timeZone }: { clientId: string; note: ClientNote; timeZone: string }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [state, setState] = useState<ActionState>({});
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await saveNoteAction(clientId, note.id, {}, formData);
      setState(result);
      if (result.ok) {
        setEditing(false);
        toast.success("Note updated");
        router.refresh();
      }
    });
  }

  async function remove() {
    setBusy(true);
    const r = await deleteNoteAction(clientId, note.id);
    setBusy(false);
    if (!r.ok) return void toast.error(r.error);
    setDeleting(false);
    toast.success("Note deleted");
    router.refresh();
  }

  return (
    <li className="rounded-lg border border-border bg-surface p-4 shadow-sm">
      {editing ? (
        <form onSubmit={onSubmit} className="space-y-2" noValidate>
          {state.error && <FormBanner tone="error">{state.error}</FormBanner>}
          <label htmlFor={`note-${note.id}`} className="sr-only">
            Edit note
          </label>
          <Textarea id={`note-${note.id}`} name="body" rows={4} defaultValue={note.body} maxLength={5000} aria-invalid={!!state.fieldErrors?.body} />
          {state.fieldErrors?.body && (
            <p role="alert" className="text-xs text-danger">
              {state.fieldErrors.body}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" loading={pending}>
              Save
            </Button>
          </div>
        </form>
      ) : (
        <>
          <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{note.body}</p>
          <div className="mt-3 flex items-center justify-between gap-2">
            <time dateTime={new Date(note.createdAt).toISOString()} className="text-xs text-muted-foreground">
              {when(note.createdAt, timeZone)}
            </time>
            <div className="flex">
              <Button variant="ghost" size="icon-sm" aria-label="Edit note" onClick={() => setEditing(true)}>
                <Pencil />
              </Button>
              <Button variant="ghost" size="icon-sm" aria-label="Delete note" onClick={() => setDeleting(true)}>
                <Trash2 />
              </Button>
            </div>
          </div>
        </>
      )}
      <ConfirmDialog open={deleting} onOpenChange={setDeleting} title="Delete this note?" description="This can't be undone." confirmLabel="Delete note" loading={busy} onConfirm={remove} />
    </li>
  );
}
