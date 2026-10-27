import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Dumbbell, HeartPulse, Mail, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionHeader } from "@/components/ui/card";
import { GoalCard } from "@/components/goals/goal-card";
import { AddGoalButton } from "@/components/goals/add-goal-button";
import { progressByGoal } from "@/components/sessions/goal-data";
import { reviewState } from "@/components/clients/status-badges";
import { requireTrainer } from "@/lib/auth";
import { getClient } from "@/lib/data/clients";
import { listGoals } from "@/lib/data/goals";
import { exerciseHistory, listExercises, listSessions } from "@/lib/data/sessions";
import { formatDate, relativeDay, todayIn } from "@/lib/dates";
import { summarizeSets } from "@/lib/domain/progress";
import { kindLabel, statusLabel } from "@/lib/domain/types";
import { notFound } from "next/navigation";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Client overview" };

export default async function ClientOverviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const trainer = await requireTrainer();
  const client = await getClient(trainer.id, id);
  if (!client) notFound();
  const today = todayIn(trainer.timezone);
  const year = Number(today.slice(0, 4));
  const [sessions, goals, history, exercises] = await Promise.all([
    listSessions(trainer.id, id),
    listGoals(trainer.id, id),
    exerciseHistory(trainer.id, id),
    listExercises(trainer.id),
  ]);
  const activeGoals = goals.filter((g) => g.status === "active");
  const progress = progressByGoal(activeGoals, history, today);
  const recent = sessions.slice(0, 3);
  const rs = reviewState(client.nextReviewDate, today);
  const cadence = [client.sessionLengthMin ? `${client.sessionLengthMin} min` : null, client.sessionsPerWeek ? `${client.sessionsPerWeek}× / week` : null].filter(Boolean).join(" · ");

  const facts: { label: string; value: React.ReactNode }[] = [
    { label: "Type", value: kindLabel(client.kind) },
    { label: "Status", value: statusLabel(client.status) },
    { label: "Assessment", value: formatDate(client.assessmentDate, year) },
    {
      label: "Next review",
      value: client.nextReviewDate ? (
        <span className={cn(rs === "overdue" && "text-danger", rs === "soon" && "text-warning")}>
          {formatDate(client.nextReviewDate, year)}
          <span className="text-muted-foreground"> · {relativeDay(client.nextReviewDate, today)}</span>
        </span>
      ) : (
        "Not scheduled"
      ),
    },
    { label: "Last reviewed", value: formatDate(client.lastReviewedOn, year) },
    { label: "Training since", value: formatDate(client.startDate ?? sessions.at(-1)?.sessionDate, year) },
    { label: "Cadence", value: cadence || "—" },
    { label: "Sessions logged", value: String(sessions.length) },
  ];

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_20rem]">
      <div className="min-w-0 space-y-10">
        <section>
          <h2 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Primary goal / focus</h2>
          {client.primaryGoal ? (
            <p className="whitespace-pre-wrap font-display text-xl leading-snug">{client.primaryGoal}</p>
          ) : (
            <p className="text-sm text-muted-foreground">
              No goal recorded yet.{" "}
              <Link href={`/clients/${id}/edit`} className="text-primary underline-offset-4 hover:underline">
                Add one
              </Link>
            </p>
          )}
        </section>

        <section className="space-y-4">
          <SectionHeader
            title="Active goals"
            action={
              activeGoals.length > 0 ? <AddGoalButton clientId={id} exerciseNames={exercises.map((e) => e.name)} variant="secondary" label="Add" /> : undefined
            }
          />
          {activeGoals.length === 0 ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-dashed border-border-strong px-4 py-5">
              <p className="text-sm text-muted-foreground">Set a target to track progress toward, like a lift weight by a date.</p>
              <AddGoalButton clientId={id} exerciseNames={exercises.map((e) => e.name)} variant="secondary" />
            </div>
          ) : (
            <ul className="space-y-3">
              {activeGoals.map((g) => (
                <GoalCard key={g.id} goal={g} progress={progress[g.id]} exerciseNames={[]} today={today} compact />
              ))}
            </ul>
          )}
        </section>

        <section className="space-y-4">
          <SectionHeader
            title="Recent sessions"
            action={
              sessions.length > 3 ? (
                <Button asChild variant="ghost" size="sm">
                  <Link href={`/clients/${id}/sessions`}>
                    All {sessions.length} <ArrowRight />
                  </Link>
                </Button>
              ) : undefined
            }
          />
          {recent.length === 0 ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-dashed border-border-strong px-4 py-5">
              <p className="text-sm text-muted-foreground">No sessions yet.</p>
              {!client.archivedAt && (
                <Button asChild size="sm">
                  <Link href={`/clients/${id}/sessions/new`}>
                    <Dumbbell /> Log first session
                  </Link>
                </Button>
              )}
            </div>
          ) : (
            <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface">
              {recent.map((s) => (
                <li key={s.id}>
                  <Link href={`/clients/${id}/sessions/${s.id}`} className="block px-4 py-3 transition-colors hover:bg-muted/60">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="font-medium">{formatDate(s.sessionDate, year)}</span>
                      <span className="truncate text-sm text-muted-foreground">{s.focus}</span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                      {s.entries.map((e) => `${e.exerciseName} ${summarizeSets(e.sets)}`).join(" · ")}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <aside className="space-y-6">
        <dl className="divide-y divide-border rounded-lg border border-border bg-surface text-sm">
          {facts.map((f) => (
            <div key={f.label} className="flex items-baseline justify-between gap-4 px-4 py-2.5">
              <dt className="text-muted-foreground">{f.label}</dt>
              <dd className="text-right font-medium">{f.value}</dd>
            </div>
          ))}
        </dl>

        {client.healthNotes && (
          <div className="rounded-lg border border-warning/30 bg-warning-soft p-4 text-sm">
            <h3 className="mb-1.5 flex items-center gap-2 font-medium text-warning">
              <HeartPulse className="size-4" aria-hidden /> Health notes
            </h3>
            <p className="whitespace-pre-wrap text-foreground-soft">{client.healthNotes}</p>
          </div>
        )}

        {(client.email || client.phone) && (
          <div className="space-y-2 text-sm">
            {client.email && (
              <a href={`mailto:${client.email}`} className="flex items-center gap-2 text-foreground-soft hover:text-foreground">
                <Mail className="size-4 text-muted-foreground" aria-hidden /> {client.email}
              </a>
            )}
            {client.phone && (
              <a href={`tel:${client.phone}`} className="flex items-center gap-2 text-foreground-soft hover:text-foreground">
                <Phone className="size-4 text-muted-foreground" aria-hidden /> {client.phone}
              </a>
            )}
          </div>
        )}
      </aside>
    </div>
  );
}
