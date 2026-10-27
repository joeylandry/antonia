"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ChevronRight, Plus, Search, Users } from "lucide-react";
import { Input, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "./avatar";
import { HealthDot } from "./health-dot";
import { clientHealth, HEALTH_LABEL } from "@/lib/domain/status";
import { ReviewBadge, StatusBadge, reviewState } from "./status-badges";
import { daysBetween, relativeDay } from "@/lib/dates";
import { kindLabel, type ClientListItem, type ClientStatus } from "@/lib/domain/types";
import { cn } from "@/lib/utils";

type Filter = "all" | ClientStatus;
type Sort = "name" | "recent" | "review";
type HealthFilter = "all" | "on_track" | "watch" | "overdue";

const HEALTH_FILTERS: { value: Exclude<HealthFilter, "all">; label: string }[] = [
  { value: "on_track", label: HEALTH_LABEL.on_track },
  { value: "watch", label: HEALTH_LABEL.watch },
  { value: "overdue", label: HEALTH_LABEL.overdue },
];

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "on_hold", label: "On hold" },
  { value: "inactive", label: "Inactive" },
];

export function ClientList({
  clients,
  today,
  archived,
  initialHealth = "all",
}: {
  clients: ClientListItem[];
  today: string;
  archived: boolean;
  initialHealth?: HealthFilter;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("name");
  const [health, setHealth] = useState<HealthFilter>(initialHealth);

  const counts = useMemo(() => {
    const c: Record<Filter, number> = { all: clients.length, active: 0, on_hold: 0, inactive: 0 };
    clients.forEach((x) => c[x.status]++);
    return c;
  }, [clients]);

  const healthCounts = useMemo(() => {
    const c = { on_track: 0, watch: 0, overdue: 0 };
    for (const x of clients) {
      const h = clientHealth(x, today);
      if (h === "on_track" || h === "watch" || h === "overdue") c[h]++;
    }
    return c;
  }, [clients, today]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = clients.filter(
      (c) =>
        (filter === "all" || c.status === filter) &&
        (health === "all" || clientHealth(c, today) === health) &&
        (!q || c.fullName.toLowerCase().includes(q) || (c.primaryGoal ?? "").toLowerCase().includes(q)),
    );
    const byName = (a: ClientListItem, b: ClientListItem) => a.fullName.localeCompare(b.fullName, undefined, { sensitivity: "base" });
    if (sort === "name") return list.sort(byName);
    if (sort === "recent")
      return list.sort((a, b) => (b.lastSessionDate ?? "").localeCompare(a.lastSessionDate ?? "") || byName(a, b));
    return list.sort((a, b) => (a.nextReviewDate ?? "9999").localeCompare(b.nextReviewDate ?? "9999") || byName(a, b));
  }, [clients, query, filter, health, sort, today]);

  if (clients.length === 0) {
    return archived ? (
      <EmptyState icon={<Users />} title="No archived clients" description="Clients you archive show up here, with their full history intact." />
    ) : (
      <EmptyState
        icon={<Users />}
        title="Add your first client"
        description="Create a profile, then log sessions and watch their progress build over time."
        action={
          <Button asChild>
            <Link href="/clients/new">
              <Plus /> Add client
            </Link>
          </Button>
        }
      />
    );
  }

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            type="search"
            aria-label="Search clients"
            placeholder="Search by name or goal"
            className="pl-9"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-3">
          <Select aria-label="Sort clients" value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="w-full sm:w-52">
            <option value="name">Sort: Name</option>
            <option value="recent">Sort: Last session</option>
            <option value="review">Sort: Next review</option>
          </Select>
        </div>
      </div>

      {!archived && (
        <div role="group" aria-label="Filter by status" className="mt-3 flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              aria-pressed={filter === f.value}
              onClick={() => setFilter(f.value)}
              className={cn(
                "rounded-full border px-3.5 py-2 text-[0.8125rem] font-medium transition-colors md:py-1",
                filter === f.value
                  ? "border-transparent bg-primary-soft text-primary-soft-foreground"
                  : "border-border text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {f.label} <span className="tabular opacity-70">{counts[f.value]}</span>
            </button>
          ))}
        </div>
      )}

      {!archived && (
        <div role="group" aria-label="Filter by status light" className="mt-2 flex flex-wrap items-center gap-1.5">
          {HEALTH_FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              aria-pressed={health === f.value}
              onClick={() => setHealth(health === f.value ? "all" : f.value)}
              className={cn(
                "inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-[0.8125rem] font-medium transition-colors md:py-1",
                health === f.value
                  ? "border-transparent bg-primary-soft text-primary-soft-foreground"
                  : "border-border text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <HealthDot health={f.value} decorative />
              {f.label} <span className="tabular opacity-70">{healthCounts[f.value]}</span>
            </button>
          ))}
        </div>
      )}

      {visible.length === 0 ? (
        <p className="mt-10 text-center text-sm text-muted-foreground" role="status">
          No clients match your search.
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface">
          {visible.map((c) => {
            const stale = c.status === "active" && c.lastSessionDate && daysBetween(c.lastSessionDate, today) > 21;
            return (
              <li key={c.id}>
                <Link
                  href={`/clients/${c.id}`}
                  prefetch={false}
                  className="group flex items-center gap-3.5 px-4 py-3.5 transition-colors hover:bg-muted/60 focus-visible:bg-muted/60"
                >
                  <span className="relative shrink-0">
                    <Avatar name={c.fullName} />
                    <HealthDot health={clientHealth(c, today)} className="absolute -bottom-0.5 -right-0.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="truncate font-medium">{c.fullName}</span>
                      <StatusBadge status={c.status} />
                      {c.kind === "fitness_assessment" && <Badge tone="info">{kindLabel(c.kind)}</Badge>}
                      <ReviewBadge nextReviewDate={reviewState(c.nextReviewDate, today) === "scheduled" ? null : c.nextReviewDate} today={today} />
                    </div>
                    <p className="mt-0.5 line-clamp-1 text-sm text-muted-foreground">{c.primaryGoal || "No goal set yet"}</p>
                  </div>
                  <div className="hidden w-40 shrink-0 text-right text-sm sm:block">
                    {c.lastSessionDate ? (
                      <>
                        <div className={cn(stale && "text-warning")}>Last session</div>
                        <div className="text-muted-foreground">{relativeDay(c.lastSessionDate, today)}</div>
                      </>
                    ) : (
                      <span className="text-muted-foreground">No sessions yet</span>
                    )}
                  </div>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      <p className="mt-3 text-xs text-muted-foreground">
        {visible.length === clients.length ? `${clients.length} ${clients.length === 1 ? "client" : "clients"}` : `${visible.length} of ${clients.length} clients`}
      </p>
    </div>
  );
}
