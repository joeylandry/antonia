import type { Metadata } from "next";
import Link from "next/link";
import { Dumbbell, Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { SectionHeader } from "@/components/ui/card";
import { requireTrainer } from "@/lib/auth";
import { listSessions } from "@/lib/data/sessions";
import { formatDate, todayIn } from "@/lib/dates";
import { summarizeSets } from "@/lib/domain/progress";

export const metadata: Metadata = { title: "Sessions" };

const PAGE = 15;

export default async function SessionsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ show?: string }>;
}) {
  const { id } = await params;
  const { show } = await searchParams;
  const limit = Math.min(Math.max(Number(show) || PAGE, PAGE), 1000);
  const trainer = await requireTrainer();
  const allSessions = await listSessions(trainer.id, id);
  const sessions = allSessions.slice(0, limit);
  const year = Number(todayIn(trainer.timezone).slice(0, 4));

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Session log"
        description={allSessions.length ? `${allSessions.length} ${allSessions.length === 1 ? "session" : "sessions"}, newest first.` : undefined}
      />

      {sessions.length === 0 ? (
        <EmptyState
          icon={<Dumbbell />}
          title="No sessions logged yet"
          description="Log the first workout to start building this client's history and progress charts."
          action={
            <Button asChild>
              <Link href={`/clients/${id}/sessions/new`}>
                <Plus /> Log first session
              </Link>
            </Button>
          }
        />
      ) : (
        <ol className="space-y-4">
          {sessions.map((s) => (
            <li key={s.id} className="overflow-hidden rounded-lg border border-border bg-surface shadow-sm">
              <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
                <div className="min-w-0">
                  <h3 className="font-display text-lg font-medium leading-tight">{formatDate(s.sessionDate, year)}</h3>
                  {s.focus && <p className="text-sm text-muted-foreground">{s.focus}</p>}
                </div>
                <Button asChild variant="ghost" size="sm" data-print-hide>
                  <Link href={`/clients/${id}/sessions/${s.id}`} aria-label={`Edit session on ${formatDate(s.sessionDate)}`}>
                    <Pencil /> Edit
                  </Link>
                </Button>
              </div>
              <table className="w-full table-fixed text-sm">
                <colgroup>
                  <col className="w-2/5 md:w-[28%]" />
                  <col className="w-3/5 md:w-[30%]" />
                  <col className="hidden md:table-column" />
                </colgroup>
                <thead className="sr-only">
                  <tr>
                    <th>Exercise</th>
                    <th>Performed</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {s.entries.map((e) => (
                    <tr key={e.id} className="align-top">
                      <td className="px-4 py-2.5 font-medium">{e.exerciseName}</td>
                      <td className="tabular px-2 py-2.5 text-foreground-soft">{summarizeSets(e.sets)}</td>
                      <td className="hidden px-4 py-2.5 text-muted-foreground md:table-cell">{e.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {s.entries.some((e) => e.notes) && (
                <ul className="space-y-1 border-t border-border px-4 py-3 text-sm text-muted-foreground md:hidden">
                  {s.entries.filter((e) => e.notes).map((e) => (
                    <li key={e.id}>
                      <span className="font-medium text-foreground-soft">{e.exerciseName}:</span> {e.notes}
                    </li>
                  ))}
                </ul>
              )}
              {s.notes && <p className="border-t border-border bg-muted/40 px-4 py-3 text-sm text-foreground-soft">{s.notes}</p>}
            </li>
          ))}
        </ol>
      )}
      {allSessions.length > sessions.length && (
        <div className="flex justify-center pt-2" data-print-hide>
          <Button asChild variant="secondary">
            <Link href={`/clients/${id}/sessions?show=${limit + PAGE}`} scroll={false} prefetch={false}>
              Show {Math.min(PAGE, allSessions.length - sessions.length)} older sessions ({allSessions.length - sessions.length} more)
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}
