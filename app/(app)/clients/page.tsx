import type { Metadata } from "next";
import Link from "next/link";
import { Archive, Plus } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { ClientList } from "@/components/clients/client-list";
import { requireTrainer } from "@/lib/auth";
import { listClients } from "@/lib/data/clients";
import { todayIn } from "@/lib/dates";

export const metadata: Metadata = { title: "Clients" };

export default async function ClientsPage({ searchParams }: { searchParams: Promise<{ archived?: string }> }) {
  const { archived } = await searchParams;
  const showArchived = archived === "1";
  const trainer = await requireTrainer();
  const clients = await listClients(trainer.id, { archived: showArchived });

  return (
    <div className="space-y-6">
      <PageHeader
        title={showArchived ? "Archived clients" : "Clients"}
        description={showArchived ? "Archived clients keep their full history and can be restored any time." : undefined}
        actions={
          <>
            <Button asChild variant="ghost">
              <Link href={showArchived ? "/clients" : "/clients?archived=1"}>
                <Archive /> {showArchived ? "Back to clients" : "Archived"}
              </Link>
            </Button>
            {!showArchived && (
              <Button asChild>
                <Link href="/clients/new">
                  <Plus /> Add client
                </Link>
              </Button>
            )}
          </>
        }
      />
      <ClientList clients={clients} today={todayIn(trainer.timezone)} archived={showArchived} />
    </div>
  );
}
