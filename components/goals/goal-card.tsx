"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, MoreHorizontal, Pencil, RotateCcw, Target, Trash2, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { GoalDialog } from "./goal-dialog";
import { deleteGoalAction, setGoalStatusAction } from "@/app/(app)/clients/[id]/actions";
import { daysBetween, formatDate } from "@/lib/dates";
import type { GoalProgress } from "@/lib/domain/progress";
import type { Goal, GoalStatus } from "@/lib/domain/types";
import { cn } from "@/lib/utils";

export function GoalCard({
  goal,
  progress,
  exerciseNames,
  today,
  compact,
}: {
  goal: Goal;
  progress: GoalProgress | null;
  exerciseNames: string[];
  today: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [busy, setBusy] = useState(false);
  const year = Number(today.slice(0, 4));
  const active = goal.status === "active";
  const reached = active && progress?.achieved;

  async function setStatus(status: GoalStatus, message: string) {
    const r = await setGoalStatusAction(goal.clientId, goal.id, status);
    if (!r.ok) return void toast.error(r.error);
    toast.success(message);
    router.refresh();
  }

  async function remove() {
    setBusy(true);
    const r = await deleteGoalAction(goal.clientId, goal.id);
    setBusy(false);
    if (!r.ok) return void toast.error(r.error);
    setDeleting(false);
    toast.success("Goal deleted");
    router.refresh();
  }

  const due = goal.targetDate ? daysBetween(today, goal.targetDate) : null;
  return (
    <li className={cn("rounded-lg border border-border bg-surface p-4 shadow-sm", !active && "opacity-80")}>
      <div className="flex items-start gap-3">
        <span className={cn("mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full", goal.status === "achieved" ? "bg-success-soft text-success" : "bg-primary-soft text-primary-soft-foreground")}>
          {goal.status === "achieved" ? <CheckCircle2 className="size-4" /> : <Target className="size-4" />}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h3 className="font-medium leading-snug">{goal.title}</h3>
            {goal.status === "achieved" && <Badge tone="success">Achieved{goal.achievedOn ? ` ${formatDate(goal.achievedOn, year)}` : ""}</Badge>}
            {goal.status === "dropped" && <Badge>Dropped</Badge>}
            {reached && <Badge tone="success">Target reached</Badge>}
          </div>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {goal.kind === "lift" ? `${goal.exerciseName} · ${goal.targetValue} lb` : "General goal"}
            {goal.targetDate && (
              <>
                {" · by "}
                {formatDate(goal.targetDate, year)}
                {active && due != null && !reached && (
                  <span className={cn(due < 0 && "text-danger")}>{due < 0 ? ` (${-due} days overdue)` : due === 0 ? " (today)" : ` (${due} days left)`}</span>
                )}
              </>
            )}
          </p>

          {goal.kind === "lift" && progress && (
            <div className="mt-3">
              {progress.current == null ? (
                <p className="text-sm text-muted-foreground">No {goal.exerciseName} logged yet. Progress appears after the first session.</p>
              ) : (
                <>
                  <div
                    role="progressbar"
                    aria-label={`Progress toward ${goal.title}`}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={progress.percent}
                    className="h-2 overflow-hidden rounded-full bg-muted"
                  >
                    <div className={cn("h-full rounded-full transition-[width]", progress.achieved ? "bg-success" : "bg-primary")} style={{ width: `${progress.percent}%` }} />
                  </div>
                  <div className="mt-1.5 flex flex-wrap justify-between gap-x-4 text-xs text-muted-foreground">
                    <span>
                      Started at <span className="tabular text-foreground-soft">{progress.baseline} lb</span>
                    </span>
                    <span>
                      Best <span className="tabular font-medium text-foreground">{progress.current} lb</span> · {progress.percent}% of the way to {progress.target} lb
                    </span>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {!compact && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${goal.title}`}>
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => setEditing(true)}>
                <Pencil /> Edit
              </DropdownMenuItem>
              {active ? (
                <>
                  <DropdownMenuItem onSelect={() => setStatus("achieved", "Marked as achieved")}>
                    <CheckCircle2 /> Mark achieved
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => setStatus("dropped", "Goal dropped")}>
                    <XCircle /> Drop goal
                  </DropdownMenuItem>
                </>
              ) : (
                <DropdownMenuItem onSelect={() => setStatus("active", "Goal reopened")}>
                  <RotateCcw /> Reopen
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem danger onSelect={() => setDeleting(true)}>
                <Trash2 /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {!compact && (
        <>
          <GoalDialog clientId={goal.clientId} goal={goal} exerciseNames={exerciseNames} open={editing} onOpenChange={setEditing} />
          <ConfirmDialog
            open={deleting}
            onOpenChange={setDeleting}
            title="Delete this goal?"
            description="The goal is removed. Logged sessions are not affected."
            confirmLabel="Delete goal"
            loading={busy}
            onConfirm={remove}
          />
        </>
      )}
    </li>
  );
}
