"use client";

import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { FormBanner } from "@/components/forms/form-banner";
import { saveGoalAction } from "@/app/(app)/clients/[id]/actions";
import type { Goal, GoalKind } from "@/lib/domain/types";
import { cn } from "@/lib/utils";

export function GoalDialog({
  clientId,
  goal,
  exerciseNames,
  open,
  onOpenChange,
}: {
  clientId: string;
  goal?: Goal;
  exerciseNames: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={goal ? "Edit goal" : "New goal"} description="A lift target tracks itself from logged sessions. Any other goal is a note to check in on.">
        {/* Remount on open so the form resets each time. */}
        {open && <GoalForm clientId={clientId} goal={goal} exerciseNames={exerciseNames} onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}

function GoalForm({ clientId, goal, exerciseNames, onDone }: { clientId: string; goal?: Goal; exerciseNames: string[]; onDone: () => void }) {
  const router = useRouter();
  const id = useId();
  const [kind, setKind] = useState<GoalKind>(goal?.kind ?? "lift");
  const [title, setTitle] = useState(goal?.title ?? "");
  const [exercise, setExercise] = useState(goal?.exerciseName ?? "");
  const [target, setTarget] = useState(goal?.targetValue != null ? String(goal.targetValue) : "");
  const [date, setDate] = useState(goal?.targetDate ?? "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fe, setFe] = useState<Record<string, string>>({});

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const autoTitle = kind === "lift" && !title.trim() && exercise.trim() && target ? `${exercise.trim()} ${target} lb` : title;
    const res = await saveGoalAction(clientId, goal?.id ?? null, { kind, title: autoTitle, exerciseName: exercise, targetValue: target, targetDate: date });
    setPending(false);
    if (!res.ok) {
      setError(res.error);
      setFe(res.fieldErrors ?? {});
      return;
    }
    toast.success(goal ? "Goal updated" : "Goal added");
    router.refresh();
    onDone();
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      {error && <FormBanner tone="error">{error}</FormBanner>}
      <div role="radiogroup" aria-label="Goal type" className="grid grid-cols-2 gap-1 rounded-md border border-border bg-muted p-0.5">
        {(
          [
            ["lift", "Lift target"],
            ["general", "Other goal"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={kind === value}
            onClick={() => setKind(value)}
            className={cn("rounded-[5px] px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors", kind === value && "bg-surface text-foreground shadow-sm")}
          >
            {label}
          </button>
        ))}
      </div>

      {kind === "lift" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Exercise" htmlFor={`${id}-ex`} error={fe.exerciseName}>
            <Input id={`${id}-ex`} list={`${id}-list`} value={exercise} onChange={(e) => setExercise(e.target.value)} placeholder="e.g. Squat" autoComplete="off" aria-invalid={!!fe.exerciseName} />
            <datalist id={`${id}-list`}>
              {exerciseNames.map((n) => (
                <option key={n} value={n} />
              ))}
            </datalist>
          </Field>
          <Field label="Target weight (lb)" htmlFor={`${id}-target`} error={fe.targetValue}>
            <Input id={`${id}-target`} type="number" inputMode="decimal" step="any" min={1} value={target} onChange={(e) => setTarget(e.target.value)} aria-invalid={!!fe.targetValue} />
          </Field>
        </div>
      )}

      <Field
        label={kind === "lift" ? "Goal title" : "Goal"}
        htmlFor={`${id}-title`}
        optional={kind === "lift"}
        error={fe.title}
        hint={kind === "lift" ? "Leave blank to use “Squat 180 lb”." : undefined}
      >
        <Input id={`${id}-title`} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} placeholder={kind === "lift" ? "" : "e.g. Hike the 4000 footers"} aria-invalid={!!fe.title} />
      </Field>

      <Field label="Target date" htmlFor={`${id}-date`} optional error={fe.targetDate}>
        <Input id={`${id}-date`} type="date" value={date} onChange={(e) => setDate(e.target.value)} aria-invalid={!!fe.targetDate} />
      </Field>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" loading={pending}>
          {goal ? "Save goal" : "Add goal"}
        </Button>
      </div>
    </form>
  );
}
