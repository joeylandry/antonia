import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { SessionEditor } from "@/components/sessions/session-editor";
import { loadEditorData } from "@/components/sessions/session-page-data";
import { requireTrainer } from "@/lib/auth";
import { getClient } from "@/lib/data/clients";
import { todayIn } from "@/lib/dates";

export const metadata: Metadata = { title: "Log session" };

export default async function NewSessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const trainer = await requireTrainer();
  const client = await getClient(trainer.id, id);
  if (!client) notFound();
  if (client.archivedAt) redirect(`/clients/${id}`);
  const data = await loadEditorData(trainer.id, id);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Log session" description={`For ${client.fullName}. Last-time numbers appear as you add exercises.`} className="mb-6" />
      <SessionEditor
        clientId={id}
        clientName={client.fullName}
        today={todayIn(trainer.timezone)}
        session={null}
        exerciseNames={data.exerciseNames}
        focusOptions={data.focusOptions}
        lastByName={data.lastByName}
        previousSession={data.previousSession}
      />
    </div>
  );
}
