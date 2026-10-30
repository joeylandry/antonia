import type { Metadata } from "next";
import { SectionHeader } from "@/components/ui/card";
import { NotesPanel } from "@/components/clients/notes-panel";
import { requireTrainer } from "@/lib/auth";
import { listNotes } from "@/lib/data/notes";

export const metadata: Metadata = { title: "Notes" };

export default async function NotesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const trainer = await requireTrainer();
  const notes = await listNotes(id);
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <SectionHeader title="Notes" description="Private to you. Newest first." />
      <NotesPanel clientId={id} notes={notes} timeZone={trainer.timezone} />
    </div>
  );
}
