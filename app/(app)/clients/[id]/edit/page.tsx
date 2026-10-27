import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { ClientForm } from "@/components/clients/client-form";
import { requireTrainer } from "@/lib/auth";
import { getClient } from "@/lib/data/clients";
import { updateClientAction } from "../../actions";

export const metadata: Metadata = { title: "Edit client" };

export default async function EditClientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const trainer = await requireTrainer();
  const client = await getClient(trainer.id, id);
  if (!client) notFound();
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title={`Edit ${client.fullName}`} className="mb-8" />
      <ClientForm action={updateClientAction.bind(null, id)} client={client} cancelHref={`/clients/${id}`} submitLabel="Save changes" />
    </div>
  );
}
