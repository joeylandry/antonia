"use client";

import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { Controller, FormProvider, useFieldArray, useForm, useFormContext, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { Copy, History, Plus, Timer, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { FormBanner } from "@/components/forms/form-banner";
import { ConfirmDialog } from "@/components/ui/dialog";
import { saveSessionAction, deleteSessionAction } from "@/app/(app)/clients/[id]/actions";
import { formatDate } from "@/lib/dates";
import { summarizeSets } from "@/lib/domain/progress";
import type { SetEntry, WorkoutSession } from "@/lib/domain/types";
import { cn } from "@/lib/utils";

type SetValues = { reps: string; weight: string; seconds: string };
type EntryValues = { exerciseName: string; notes: string; sets: SetValues[] };
type FormValues = { sessionDate: string; focus: string; notes: string; entries: EntryValues[] };

export type LastPerformanceMap = Record<string, { date: string; sets: SetEntry[] }>;

const toStr = (n: number | undefined) => (n == null ? "" : String(n));
const toSetValues = (s: SetEntry): SetValues => ({ reps: toStr(s.reps), weight: toStr(s.weight), seconds: toStr(s.seconds) });
const emptySet = (): SetValues => ({ reps: "", weight: "", seconds: "" });
const num = (v: string) => (v.trim() === "" || Number.isNaN(Number(v)) ? undefined : Number(v));

function entryFrom(name: string, sets: SetEntry[], notes = ""): EntryValues {
  return { exerciseName: name, notes, sets: sets.length ? sets.map(toSetValues) : [emptySet()] };
}

export function SessionEditor({
  clientId,
  clientName,
  today,
  session,
  exerciseNames,
  focusOptions,
  lastByName,
  previousSession,
}: {
  clientId: string;
  clientName: string;
  today: string;
  session: WorkoutSession | null;
  exerciseNames: string[];
  focusOptions: string[];
  lastByName: LastPerformanceMap;
  previousSession: WorkoutSession | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const listId = useId();
  const focusListId = useId();

  const methods = useForm<FormValues>({
    defaultValues: session
      ? {
          sessionDate: session.sessionDate,
          focus: session.focus ?? "",
          notes: session.notes ?? "",
          entries: session.entries.map((e) => entryFrom(e.exerciseName, e.sets, e.notes ?? "")),
        }
      : { sessionDate: today, focus: "", notes: "", entries: [entryFrom("", [])] },
  });
  const { control, register, handleSubmit, setError, formState } = methods;
  const entries = useFieldArray({ control, name: "entries" });
  const firstName = useWatch({ control, name: "entries.0.exerciseName" });
  const errors = formState.errors;

  function repeatPrevious() {
    if (!previousSession) return;
    methods.setValue("focus", previousSession.focus ?? "");
    methods.setValue(
      "entries",
      previousSession.entries.map((e) => entryFrom(e.exerciseName, e.sets, "")),
    );
  }

  const onSubmit = handleSubmit((values) => {
    setFormError(null);
    const named = values.entries.filter((e) => e.exerciseName.trim() !== "");
    if (named.length === 0) {
      setError("entries.0.exerciseName", { message: "Choose or type an exercise." });
      setFormError("Add at least one exercise.");
      return;
    }
    const payload = {
      clientId,
      sessionDate: values.sessionDate,
      focus: values.focus,
      notes: values.notes,
      entries: named.map((e) => ({
        exerciseName: e.exerciseName,
        notes: e.notes,
        sets: e.sets.map((s) => ({ reps: num(s.reps), weight: num(s.weight), seconds: num(s.seconds) })),
      })),
    };
    startTransition(async () => {
      const result = await saveSessionAction(session?.id ?? null, payload);
      if (!result.ok) {
        setFormError(result.error);
        for (const [path, message] of Object.entries(result.fieldErrors ?? {})) {
          // Map server paths (entries.N...) back onto the form; N indexes the filtered list.
          const idx = path.match(/^entries\.(\d+)/);
          if (idx) {
            const original = values.entries.map((e, i) => (e.exerciseName.trim() ? i : -1)).filter((i) => i >= 0)[Number(idx[1])];
            setError(path.replace(/^entries\.\d+/, `entries.${original}`) as `entries.${number}.exerciseName`, { message });
          } else if (path === "sessionDate" || path === "focus" || path === "notes") {
            setError(path, { message });
          }
        }
        return;
      }
      toast.success(session ? "Session updated" : "Session saved");
      router.push(`/clients/${clientId}/sessions`);
      router.refresh();
    });
  });

  async function onDelete() {
    if (!session) return;
    setDeleting(true);
    const result = await deleteSessionAction(clientId, session.id);
    setDeleting(false);
    if (!result.ok) {
      toast.error(result.error);
      setConfirmDelete(false);
      return;
    }
    toast.success("Session deleted");
    router.push(`/clients/${clientId}/sessions`);
    router.refresh();
  }

  return (
    <FormProvider {...methods}>
      <form onSubmit={onSubmit} className="space-y-6" noValidate>
        {formError && <FormBanner tone="error">{formError}</FormBanner>}

        <div className="grid gap-4 sm:grid-cols-[11rem_1fr]">
          <Field label="Date" htmlFor="sessionDate" error={errors.sessionDate?.message}>
            <Input id="sessionDate" type="date" required max="9999-12-31" {...register("sessionDate", { required: true })} />
          </Field>
          <Field label="Workout / focus" htmlFor="focus" optional error={errors.focus?.message}>
            <Input id="focus" list={focusListId} placeholder="e.g. Upper Body" maxLength={120} autoComplete="off" {...register("focus")} />
            <datalist id={focusListId}>
              {focusOptions.map((f) => (
                <option key={f} value={f} />
              ))}
            </datalist>
          </Field>
        </div>

        {!session && previousSession && previousSession.entries.length > 0 && entries.fields.length === 1 && !firstName && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-primary-soft/50 px-4 py-3">
            <div className="text-sm">
              <span className="font-medium">Start from {formatDate(previousSession.sessionDate)}</span>
              <span className="text-muted-foreground">
                {previousSession.focus ? ` · ${previousSession.focus}` : ""} · {previousSession.entries.length} exercises
              </span>
            </div>
            <Button type="button" variant="secondary" size="sm" onClick={repeatPrevious}>
              <Copy /> Use as a starting point
            </Button>
          </div>
        )}

        <datalist id={listId}>
          {exerciseNames.map((n) => (
            <option key={n} value={n} />
          ))}
        </datalist>

        <ol className="space-y-4">
          {entries.fields.map((field, index) => (
            <EntryCard
              key={field.id}
              index={index}
              listId={listId}
              lastByName={lastByName}
              onRemove={entries.fields.length > 1 ? () => entries.remove(index) : undefined}
            />
          ))}
        </ol>

        <Button type="button" variant="secondary" onClick={() => entries.append(entryFrom("", []))} className="w-full sm:w-auto">
          <Plus /> Add exercise
        </Button>

        <Field label="Session notes" htmlFor="notes" optional error={errors.notes?.message}>
          <Textarea id="notes" rows={3} placeholder={`How did ${clientName.split(" ")[0]} feel? Anything to remember for next time?`} maxLength={4000} {...register("notes")} />
        </Field>

        <div className="sticky bottom-16 -mx-4 flex items-center justify-between gap-2 border-t border-border bg-background/95 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:px-0 sm:backdrop-blur-none lg:bottom-0">
          <div>
            {session && (
              <Button type="button" variant="danger-ghost" onClick={() => setConfirmDelete(true)}>
                <Trash2 /> Delete
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={() => router.push(`/clients/${clientId}/sessions`)}>
              Cancel
            </Button>
            <Button type="submit" loading={pending}>
              {session ? "Save changes" : "Save session"}
            </Button>
          </div>
        </div>
      </form>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete this session?"
        description="This removes the session and all its exercises from the client's history. This can't be undone."
        confirmLabel="Delete session"
        loading={deleting}
        onConfirm={onDelete}
      />
    </FormProvider>
  );
}

function EntryCard({
  index,
  listId,
  lastByName,
  onRemove,
}: {
  index: number;
  listId: string;
  lastByName: LastPerformanceMap;
  onRemove?: () => void;
}) {
  const { register, control, setValue, getValues, formState } = useFormContext<FormValues>();
  const sets = useFieldArray({ control, name: `entries.${index}.sets` });
  const name = useWatch({ control, name: `entries.${index}.exerciseName` }) ?? "";
  const watchedSets = useWatch({ control, name: `entries.${index}.sets` }) ?? [];
  const anySeconds = watchedSets.some((s) => s?.seconds !== "" && s?.seconds != null);
  const [showTime, setShowTime] = useState(anySeconds);
  const timeVisible = showTime || anySeconds;
  const last = lastByName[name.trim().toLowerCase()];
  const entryErrors = formState.errors.entries?.[index];
  const nameId = `entry-${index}-name`;

  function addSet() {
    const prev = getValues(`entries.${index}.sets`).at(-1);
    sets.append(prev ? { ...prev } : emptySet());
  }

  return (
    <li className="rounded-lg border border-border bg-surface shadow-sm">
      <div className="flex items-start gap-3 p-4 pb-3">
        <span aria-hidden className="mt-2 flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground tabular">
          {index + 1}
        </span>
        <div className="min-w-0 flex-1 space-y-1.5">
          <label htmlFor={nameId} className="sr-only">
            Exercise {index + 1}
          </label>
          <Input
            id={nameId}
            list={listId}
            placeholder="Exercise, e.g. Goblet Squat"
            maxLength={80}
            autoComplete="off"
            aria-invalid={!!entryErrors?.exerciseName}
            className="h-10 font-medium"
            {...register(`entries.${index}.exerciseName`)}
          />
          {entryErrors?.exerciseName && (
            <p role="alert" className="text-xs text-danger">
              {entryErrors.exerciseName.message}
            </p>
          )}
          {last && (
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
              <History className="size-3.5" aria-hidden />
              <span>
                Last time ({formatDate(last.date)}): <span className="text-foreground-soft">{summarizeSets(last.sets)}</span>
              </span>
              <button
                type="button"
                className="font-medium text-primary underline-offset-2 hover:underline"
                onClick={() => setValue(`entries.${index}.sets`, last.sets.length ? last.sets.map(toSetValues) : [emptySet()], { shouldDirty: true })}
              >
                Use these sets
              </button>
            </div>
          )}
        </div>
        {onRemove && (
          <Button type="button" variant="ghost" size="icon-sm" onClick={onRemove} aria-label={`Remove exercise ${index + 1}`}>
            <X />
          </Button>
        )}
      </div>

      <div className="px-4 pb-1">
        <div className={cn("grid items-center gap-2 text-xs font-medium text-muted-foreground", timeVisible ? "grid-cols-[1.5rem_1fr_1fr_1fr_2rem]" : "grid-cols-[1.5rem_1fr_1fr_2rem]")}>
          <span className="sr-only">Set</span>
          <span className="col-start-2">Reps</span>
          <span>Weight (lb)</span>
          {timeVisible && <span>Seconds</span>}
        </div>
        <div className="mt-1 space-y-2">
          {sets.fields.map((f, s) => (
            <div key={f.id} className={cn("grid items-center gap-2", timeVisible ? "grid-cols-[1.5rem_1fr_1fr_1fr_2rem]" : "grid-cols-[1.5rem_1fr_1fr_2rem]")}>
              <span className="text-center text-xs text-muted-foreground tabular">{s + 1}</span>
              <Input
                type="number"
                inputMode="numeric"
                min={0}
                max={1000}
                step={1}
                aria-label={`Set ${s + 1} reps`}
                className="h-10"
                {...register(`entries.${index}.sets.${s}.reps`)}
              />
              <Input
                type="number"
                inputMode="decimal"
                min={0}
                max={2000}
                step="any"
                aria-label={`Set ${s + 1} weight in pounds`}
                className="h-10"
                {...register(`entries.${index}.sets.${s}.weight`)}
              />
              {timeVisible && (
                <Input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={7200}
                  step={1}
                  aria-label={`Set ${s + 1} seconds`}
                  className="h-10"
                  {...register(`entries.${index}.sets.${s}.seconds`)}
                />
              )}
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                disabled={sets.fields.length === 1}
                onClick={() => sets.remove(s)}
                aria-label={`Remove set ${s + 1}`}
              >
                <X />
              </Button>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1 px-3 pb-3 pt-2">
        <Button type="button" variant="ghost" size="sm" onClick={addSet}>
          <Plus /> Add set
        </Button>
        {!timeVisible && (
          <Button type="button" variant="ghost" size="sm" onClick={() => setShowTime(true)}>
            <Timer /> Add timing
          </Button>
        )}
      </div>

      <div className="border-t border-border px-4 py-3">
        <Controller
          control={control}
          name={`entries.${index}.notes`}
          render={({ field }) => (
            <Input
              {...field}
              aria-label={`Notes for exercise ${index + 1}`}
              placeholder="Notes / progress, e.g. form great, move up next time"
              maxLength={2000}
              className="h-9 border-transparent bg-muted/60 hover:border-border-strong"
            />
          )}
        />
      </div>
    </li>
  );
}
