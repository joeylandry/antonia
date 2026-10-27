import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { ClientForm } from "@/components/clients/client-form";
import { createClientAction } from "../actions";

export const metadata: Metadata = { title: "New client" };

export default function NewClientPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="New client" description="Just a name and type to start. You can fill in the rest any time." className="mb-8" />
      <ClientForm action={createClientAction} cancelHref="/clients" submitLabel="Add client" />
    </div>
  );
}
