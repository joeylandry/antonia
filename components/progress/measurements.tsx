"use client";

import { useRouter } from "next/navigation";
import { useId, useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, Ruler, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, ConfirmDialog } from "@/components/ui/dialog";
import { Input, Select } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { EmptyState } from "@/components/empty-state";
import { FormBanner } from "@/components/forms/form-banner";
import { TrendChart } from "@/components/charts/trend-chart";
import { RangeTabs } from "./range-tabs";
import { Stat } from "./stat";
import { createMetricAction, deleteMetricAction, deleteMetricEntryAction, saveMetricEntryAction } from "@/app/(app)/clients/[id]/actions";
import { formatDate } from "@/lib/dates";
import { changeOverSeries, filterRange, type RangeKey } from "@/lib/domain/progress";
import type { Metric, MetricEntry } from "@/lib/domain/types";

const PRESETS = [
  { name: "Body weight", unit: "lb", direction: "neutral" },
  { name: "Body fat", unit: "%", direction: "down" },
  { name: "Waist", unit: "in", direction: "neutral" },
  { name: "Resting heart rate", unit: "bpm", direction: "down" },
] as const;

type Item = { metric: Metric; entries: MetricEntry[] };

export function Measurements({ clientId, items, today }: { clientId: string; items: Item[]; today: string }) {
  const [adding, setAdding] = useState(false);
  const [range, setRange] = useState<RangeKey>("all");

  return (
    <section className="space-y-5" aria-labelledby="measurements-heading">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="measurements-heading" className="font-display text-xl font-medium tracking-tight">
            Measurements
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">Track anything else that matters for this client, like body weight.</p>
        </div>
        <div className="flex items-center gap-2">
          {items.length > 0 && <RangeTabs value={range} onChange={setRange} />}
          <Button size="sm" variant="secondary" onClick={() => setAdding(true)}>
            <Plus /> Track measurement
          </Button>
        </div>
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={<Ruler />}
          title="No measurements tracked"
          description="Choose what to track for this client, then add a reading at each check-in."
          action={
            <Button variant="secondary" onClick={() => setAdding(true)}>
              <Plus /> Track a measurement
            </Button>
          }
        />
      ) : (
        <div className="space-y-5">
          {items.map((item) => (
            <MetricCard key={item.metric.id} clientId={clientId} item={item} today={today} range={range} />
          ))}
        </div>
      )}
      <NewMetricDialog clientId={clientId} open={adding} onOpenChange={setAdding} />
    </section>
  );
}

function MetricCard({ clientId, item, today, range }: { clientId: string; item: Item; today: string; range: RangeKey }) {
  const router = useRouter();
  const { metric, entries } = item;
  const [logging, setLogging] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [busy, setBusy] = useState(false);
  const all = useMemo(() => entries.map((e) => ({ date: e.entryDate, value: e.value })), [entries]);
  const points = filterRange(all, range, today);
  const change = changeOverSeries(points);
  const good = change && (metric.direction === "up" ? change.delta > 0 : metric.direction === "down" ? change.delta < 0 : null);
  const bad = change && (metric.direction === "up" ? change.delta < 0 : metric.direction === "down" ? change.delta > 0 : null);

  async function remove() {
    setBusy(true);
    const r = await deleteMetricAction(clientId, metric.id);
    setBusy(false);
    if (!r.ok) return void toast.error(r.error);
    setRemoving(false);
    toast.success("Measurement removed");
    router.refresh();
  }

  async function deleteEntry(id: string) {
    const r = await deleteMetricEntryAction(clientId, id);
    if (!r.ok) return void toast.error(r.error);
    toast.success("Reading deleted");
    router.refresh();
  }

  return (
    <article className="rounded-lg border border-border bg-surface p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h3 className="font-display text-lg font-medium">
          {metric.name}
          {metric.unit && <span className="ml-1.5 text-sm font-normal text-muted-foreground">{metric.unit}</span>}
        </h3>
        <div className="flex items-center gap-1">
          <Button size="sm" onClick={() => setLogging(true)}>
            <Plus /> Add reading
          </Button>
          <Button size="icon-sm" variant="ghost" aria-label={`Stop tracking ${metric.name}`} onClick={() => setRemoving(true)}>
            <Trash2 />
          </Button>
        </div>
      </div>

      {entries.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">No readings yet. Add the first one to start the chart.</p>
      ) : points.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">No readings in this date range.</p>
      ) : (
        <>
          <dl className="mt-4 grid grid-cols-3 gap-4">
            <Stat label="Latest" value={points.at(-1)!.value} sub={metric.unit} />
            <Stat label="First" value={points[0].value} sub={metric.unit} />
            <Stat
              label="Change"
              value={change ? `${change.delta > 0 ? "+" : ""}${change.delta}` : "—"}
              sub={change?.pct != null ? `${change.pct > 0 ? "+" : ""}${change.pct}%` : "need 2+ readings"}
              tone={good ? "good" : bad ? "bad" : "neutral"}
            />
          </dl>
          {points.length > 1 && (
            <div className="mt-4">
              <TrendChart points={points} unit={metric.unit} height={200} ariaLabel={`${metric.name} over time`} color="var(--chart-2)" />
            </div>
          )}
          <details className="mt-3">
            <summary className="cursor-pointer list-none text-sm text-muted-foreground hover:text-foreground [&::-webkit-details-marker]:hidden">View readings</summary>
            <ul className="mt-2 divide-y divide-border rounded-md border border-border text-sm">
              {[...entries].reverse().map((e) => (
                <li key={e.id} className="flex items-center justify-between gap-3 px-3 py-2">
                  <span>{formatDate(e.entryDate)}</span>
                  <span className="tabular font-medium">
                    {e.value} {metric.unit}
                  </span>
                  <span className="hidden flex-1 truncate text-muted-foreground sm:block">{e.note}</span>
                  <Button size="icon-sm" variant="ghost" aria-label={`Delete reading from ${formatDate(e.entryDate)}`} onClick={() => deleteEntry(e.id)}>
                    <Trash2 />
                  </Button>
                </li>
              ))}
            </ul>
          </details>
        </>
      )}

      <ReadingDialog clientId={clientId} metric={metric} today={today} open={logging} onOpenChange={setLogging} />
      <ConfirmDialog
        open={removing}
        onOpenChange={setRemoving}
        title={`Stop tracking ${metric.name}?`}
        description="This deletes the measurement and all of its readings."
        confirmLabel="Delete measurement"
        loading={busy}
        onConfirm={remove}
      />
    </article>
  );
}

function ReadingDialog({ clientId, metric, today, open, onOpenChange }: { clientId: string; metric: Metric; today: string; open: boolean; onOpenChange: (o: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={`Add ${metric.name.toLowerCase()} reading`} description="Saving a date that already has a reading corrects it.">
        {open && <ReadingForm clientId={clientId} metric={metric} today={today} onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}

function ReadingForm({ clientId, metric, today, onDone }: { clientId: string; metric: Metric; today: string; onDone: () => void }) {
  const router = useRouter();
  const id = useId();
  const [date, setDate] = useState(today);
  const [value, setValue] = useState("");
  const [note, setNote] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fe, setFe] = useState<Record<string, string>>({});

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const r = await saveMetricEntryAction(clientId, metric.id, { entryDate: date, value, note });
    setPending(false);
    if (!r.ok) {
      setError(r.error);
      setFe(r.fieldErrors ?? {});
      return;
    }
    toast.success("Reading saved");
    router.refresh();
    onDone();
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      {error && <FormBanner tone="error">{error}</FormBanner>}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={`Value${metric.unit ? ` (${metric.unit})` : ""}`} htmlFor={`${id}-v`} error={fe.value}>
          <Input id={`${id}-v`} type="number" inputMode="decimal" step="any" value={value} onChange={(e) => setValue(e.target.value)} aria-invalid={!!fe.value} />
        </Field>
        <Field label="Date" htmlFor={`${id}-d`} error={fe.entryDate}>
          <Input id={`${id}-d`} type="date" value={date} onChange={(e) => setDate(e.target.value)} aria-invalid={!!fe.entryDate} />
        </Field>
      </div>
      <Field label="Note" htmlFor={`${id}-n`} optional error={fe.note}>
        <Input id={`${id}-n`} value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} />
      </Field>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" loading={pending}>
          Save reading
        </Button>
      </div>
    </form>
  );
}

function NewMetricDialog({ clientId, open, onOpenChange }: { clientId: string; open: boolean; onOpenChange: (o: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="Track a measurement" description="Pick a common one or name your own.">
        {open && <NewMetricForm clientId={clientId} onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}

function NewMetricForm({ clientId, onDone }: { clientId: string; onDone: () => void }) {
  const router = useRouter();
  const id = useId();
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("");
  const [direction, setDirection] = useState<"up" | "down" | "neutral">("neutral");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fe, setFe] = useState<Record<string, string>>({});

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const r = await createMetricAction(clientId, { name, unit, direction });
    setPending(false);
    if (!r.ok) {
      setError(r.error);
      setFe(r.fieldErrors ?? {});
      return;
    }
    toast.success("Measurement added");
    router.refresh();
    onDone();
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      {error && <FormBanner tone="error">{error}</FormBanner>}
      <div className="flex flex-wrap gap-1.5">
        {PRESETS.map((p) => (
          <button
            key={p.name}
            type="button"
            className="rounded-full border border-border px-3 py-1 text-[0.8125rem] font-medium text-foreground-soft hover:bg-muted"
            onClick={() => {
              setName(p.name);
              setUnit(p.unit);
              setDirection(p.direction);
            }}
          >
            {p.name}
          </button>
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-[1fr_7rem]">
        <Field label="Name" htmlFor={`${id}-n`} error={fe.name}>
          <Input id={`${id}-n`} value={name} onChange={(e) => setName(e.target.value)} maxLength={60} aria-invalid={!!fe.name} />
        </Field>
        <Field label="Unit" htmlFor={`${id}-u`} optional error={fe.unit}>
          <Input id={`${id}-u`} value={unit} onChange={(e) => setUnit(e.target.value)} maxLength={16} placeholder="lb" aria-invalid={!!fe.unit} />
        </Field>
      </div>
      <Field label="Better when" htmlFor={`${id}-dir`} hint="Used to colour changes green or red on the chart summary.">
        <Select id={`${id}-dir`} value={direction} onChange={(e) => setDirection(e.target.value as typeof direction)}>
          <option value="neutral">No preference</option>
          <option value="up">Going up</option>
          <option value="down">Going down</option>
        </Select>
      </Field>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" loading={pending}>
          Add measurement
        </Button>
      </div>
    </form>
  );
}
