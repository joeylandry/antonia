import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/clients/avatar";
import { ClientTabs } from "@/components/clients/client-tabs";
import { ClientActions } from "@/components/clients/client-actions";
import { ReviewBadge, StatusBadge } from "@/components/clients/status-badges";
import { requireTrainer } from "@/lib/auth";
import { getClient } from "@/lib/data/clients";
import { todayIn } from "@/lib/dates";
import { kindLabel } from "@/lib/domain/types";
import { HealthDot } from "@/components/clients/health-dot";
import { clientHealth, HEALTH_LABEL } from "@/lib/domain/status";
import { listSessions } from "@/lib/data/sessions";

export default async function ClientLayout({ children, params }: { children: React.ReactNode; params: Promise<{ id: string }> }) {
  const { id } = await params;
  const trainer = await requireTrainer();
  const client = await getClient(trainer.id, id);
  if (!client) notFound();
  const today = todayIn(trainer.timezone);
  const archived = client.archivedAt != null;
  const lastSessionDate = (await listSessions(trainer.id, id))[0]?.sessionDate ?? null;
  const health = clientHealth({ ...client, lastSessionDate }, today);

  return (
    <div className="space-y-6">
      <div data-print-hide>
        <Link href="/clients" className="-my-2 inline-flex items-center gap-1 py-2 text-sm text-muted-foreground hover:text-foreground">
          <ChevronLeft className="size-4" aria-hidden /> Clients
        </Link>
      </div>

      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <Avatar name={client.fullName} size="lg" />
          <div className="min-w-0">
            <h1 className="font-display text-[1.75rem] font-medium leading-tight tracking-tight sm:text-3xl">{client.fullName}</h1>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <Badge tone={health === "on_track" ? "success" : health === "watch" ? "warning" : health === "overdue" ? "danger" : health === "new" ? "info" : "neutral"} className="gap-1.5">
                <HealthDot health={health} decorative className="[&>span]:ring-0" />
                {HEALTH_LABEL[health]}
              </Badge>
              <Badge tone="neutral">{kindLabel(client.kind)}</Badge>
              <StatusBadge status={client.status} />
              {archived && <Badge tone="neutral">Archived</Badge>}
              {!archived && <ReviewBadge nextReviewDate={client.nextReviewDate} today={today} />}
            </div>
          </div>
        </div>
        <div data-print-hide className="flex shrink-0 items-center gap-2">
          {!archived && (
            <Button asChild>
              <Link href={`/clients/${client.id}/sessions/new`}>
                <Plus /> Log session
              </Link>
            </Button>
          )}
          <ClientActions clientId={client.id} clientName={client.fullName} archived={archived} />
        </div>
      </header>

      <ClientTabs clientId={client.id} />
      <div>{children}</div>
    </div>
  );
}
