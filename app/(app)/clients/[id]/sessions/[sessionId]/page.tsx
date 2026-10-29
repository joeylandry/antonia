import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { SessionEditor } from "@/components/sessions/session-editor";
import { loadEditorData } from "@/components/sessions/session-page-data";
import { requireTrainer } from "@/lib/auth";
import { getClient } from "@/lib/data/clients";
import { getSession } from "@/lib/data/sessions";
import { formatDate, todayIn } from "@/lib/dates";

export const metadata: Metadata = { title: "Edit session" };

export default async function EditSessionPage({ params }: { params: Promise<{ id: string; sessionId: string }> }) {
  const { id, sessionId } = await params;
  const trainer = await requireTrainer();
  const [client, session] = await Promise.all([getClient(id), getSession(sessionId)]);
  if (!client || !session || session.clientId !== id) notFound();
  const data = await loadEditorData(id, session.sessionDate);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Edit session" description={`${client.fullName} · ${formatDate(session.sessionDate)}`} className="mb-6" />
      <SessionEditor
        clientId={id}
        clientName={client.fullName}
        today={todayIn(trainer.timezone)}
        session={session}
        exerciseNames={data.exerciseNames}
        focusOptions={data.focusOptions}
        lastByName={data.lastByName}
        previousSession={data.previousSession}
      />
    </div>
  );
}
