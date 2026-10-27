import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, CalendarClock, CheckCircle2, ChevronRight, Plus, Target, Users } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { SectionHeader } from "@/components/ui/card";
import { Avatar } from "@/components/clients/avatar";
import { LogSessionPicker } from "@/components/dashboard/log-session-picker";
import { reviewState } from "@/components/clients/status-badges";
import { requireTrainer } from "@/lib/auth";
import { listClients } from "@/lib/data/clients";
import { goalsDueSoon, recentSessions, sessionsThisWeek } from "@/lib/data/dashboard";
import { daysBetween, formatDate, relativeDay, todayIn } from "@/lib/dates";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Today" };

const STALE_DAYS = 14;

function greeting(tz: string) {
  const hour = Number(new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", hour12: false }).format(new Date())) % 24;
  return hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
}

export default async function TodayPage() {
  const trainer = await requireTrainer();
  const today = todayIn(trainer.timezone);
  const year = Number(today.slice(0, 4));
  const [clients, recent, goalsDue, weekCount] = await Promise.all([
    listClients(trainer.id),
    recentSessions(trainer.id),
    goalsDueSoon(trainer.id, today),
    sessionsThisWeek(trainer.id, today),
  ]);

  const first = trainer.displayName.split(" ")[0];
  const dateLabel = new Intl.DateTimeFormat("en-US", { timeZone: trainer.timezone, weekday: "long", month: "long", day: "numeric" }).format(new Date());

  if (clients.length === 0) {
    return (
      <div className="space-y-8">
        <PageHeader eyebrow={dateLabel} title={`${greeting(trainer.timezone)}${first ? `, ${first}` : ""}`} />
        <EmptyState
          icon={<Users />}
          title="Let's add your first client"
          description="Create a profile in a few seconds. Then log sessions and see progress build over time."
          action={
            <Button asChild size="lg">
              <Link href="/clients/new">
                <Plus /> Add client
              </Link>
            </Button>
          }
        />
      </div>
    );
  }

  const active = clients.filter((c) => c.status === "active");
  const reviews = clients
    .filter((c) => c.status !== "inactive" && c.nextReviewDate && reviewState(c.nextReviewDate, today) !== "scheduled")
    .sort((a, b) => a.nextReviewDate!.localeCompare(b.nextReviewDate!));
  const quiet = active
    .filter((c) => (c.lastSessionDate ? daysBetween(c.lastSessionDate, today) >= STALE_DAYS : c.sessionCount === 0 && daysBetween(c.createdAt.toISOString().slice(0, 10), today) >= 7))
    .sort((a, b) => (a.lastSessionDate ?? "").localeCompare(b.lastSessionDate ?? ""));
  const nothingNeeded = reviews.length === 0 && quiet.length === 0 && goalsDue.length === 0;

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow={dateLabel}
        title={`${greeting(trainer.timezone)}${first ? `, ${first}` : ""}`}
        description={`${active.length} active ${active.length === 1 ? "client" : "clients"} · ${weekCount} ${weekCount === 1 ? "session" : "sessions"} in the last 7 days`}
        actions={<LogSessionPicker clients={active.map((c) => ({ id: c.id, name: c.fullName }))} />}
      />

      <section className="space-y-4">
        <SectionHeader title="Needs your attention" />
        {nothingNeeded ? (
          <div className="flex items-center gap-3 rounded-lg border border-border bg-surface px-4 py-5 text-sm text-muted-foreground">
            <CheckCircle2 className="size-5 text-success" aria-hidden />
            You&apos;re all caught up. No reviews due, no goals at risk, and everyone has trained recently.
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            {reviews.length > 0 && (
              <AttentionList icon={<CalendarClock />} title="Reviews">
                {reviews.map((c) => {
                  const overdue = c.nextReviewDate! < today;
                  return (
                    <AttentionRow key={c.id} href={`/clients/${c.id}`} name={c.fullName} detail={`${overdue ? "Overdue since" : "Due"} ${formatDate(c.nextReviewDate, year)}`} tone={overdue ? "danger" : "warning"} />
                  );
                })}
              </AttentionList>
            )}
            {goalsDue.length > 0 && (
              <AttentionList icon={<Target />} title="Goals coming due">
                {goalsDue.map((g) => (
                  <AttentionRow
                    key={g.id}
                    href={`/clients/${g.clientId}/goals`}
                    name={`${g.clientName} · ${g.title}`}
                    detail={g.achieved ? "Target reached" : `${g.percent}% there · ${g.daysLeft < 0 ? `${-g.daysLeft} days overdue` : g.daysLeft === 0 ? "due today" : `${g.daysLeft} days left`}`}
                    tone={g.achieved ? "success" : g.daysLeft < 0 ? "danger" : "warning"}
                  />
                ))}
              </AttentionList>
            )}
            {quiet.length > 0 && (
              <AttentionList icon={<AlertTriangle />} title={`No session in ${STALE_DAYS}+ days`}>
                {quiet.map((c) => (
                  <AttentionRow key={c.id} href={`/clients/${c.id}`} name={c.fullName} detail={c.lastSessionDate ? `Last trained ${relativeDay(c.lastSessionDate, today)}` : "No sessions logged yet"} tone="neutral" />
                ))}
              </AttentionList>
            )}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <SectionHeader
          title="Recent sessions"
          action={
            <Button asChild variant="ghost" size="sm">
              <Link href="/clients">All clients</Link>
            </Button>
          }
        />
        {recent.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border-strong px-4 py-8 text-center text-sm text-muted-foreground">No sessions logged yet. Pick a client above to log the first one.</p>
        ) : (
          <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface">
            {recent.map((s) => (
              <li key={s.id}>
                <Link href={`/clients/${s.clientId}/sessions/${s.id}`} className="flex items-center gap-3.5 px-4 py-3 transition-colors hover:bg-muted/60">
                  <Avatar name={s.clientName} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{s.clientName}</div>
                    <div className="truncate text-sm text-muted-foreground">
                      {s.focus ? `${s.focus} · ` : ""}
                      {s.exerciseCount} {s.exerciseCount === 1 ? "exercise" : "exercises"}
                    </div>
                  </div>
                  <div className="shrink-0 text-right text-sm text-muted-foreground">{relativeDay(s.sessionDate, today).replace(/^./, (c) => c.toUpperCase())}</div>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function AttentionList({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground-soft [&_svg]:size-4 [&_svg]:text-muted-foreground">
        {icon} {title}
      </h3>
      <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface">{children}</ul>
    </div>
  );
}

function AttentionRow({ href, name, detail, tone }: { href: string; name: string; detail: string; tone: "danger" | "warning" | "success" | "neutral" }) {
  return (
    <li>
      <Link href={href} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/60">
        <span
          aria-hidden
          className={cn("size-2 shrink-0 rounded-full", tone === "danger" && "bg-danger", tone === "warning" && "bg-warning", tone === "success" && "bg-success", tone === "neutral" && "bg-border-strong")}
        />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium">{name}</div>
          <div className={cn("text-sm", tone === "danger" ? "text-danger" : "text-muted-foreground")}>{detail}</div>
        </div>
        <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      </Link>
    </li>
  );
}
