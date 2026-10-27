"use client";

import Link from "next/link";
import { useActionState } from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { FormBanner } from "@/components/forms/form-banner";
import { CLIENT_KINDS, CLIENT_STATUSES, type Client } from "@/lib/domain/types";
import type { ActionState } from "@/lib/validation/shared";

export function ClientForm({
  action,
  client,
  cancelHref,
  submitLabel,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  client?: Client;
  cancelHref: string;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(action, {});
  const fe = state.fieldErrors ?? {};
  const v = (name: keyof Client & string): string => state.values?.[name] ?? (client?.[name] == null ? "" : String(client[name]));
  const err = (name: string) => ({ "aria-invalid": !!fe[name], "aria-describedby": fe[name] ? `${name}-error` : undefined });
  const moreOpen = Boolean(
    client &&
      (client.assessmentDate || client.nextReviewDate || client.startDate || client.sessionLengthMin || client.sessionsPerWeek || client.healthNotes || client.email || client.phone),
  ) || Object.keys(fe).some((k) => !["fullName", "kind", "primaryGoal", "status"].includes(k));

  return (
    <form action={formAction} className="space-y-6" noValidate>
      {state.error && <FormBanner tone="error">{state.error}</FormBanner>}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name" htmlFor="fullName" error={fe.fullName} className="sm:col-span-2">
          <Input id="fullName" name="fullName" defaultValue={v("fullName")} required maxLength={120} autoComplete="off" {...err("fullName")} />
        </Field>
        <Field label="Client type" htmlFor="kind" error={fe.kind}>
          <Select id="kind" name="kind" defaultValue={state.values?.kind ?? client?.kind ?? "personal_training"} {...err("kind")}>
            {CLIENT_KINDS.map((k) => (
              <option key={k.value} value={k.value}>
                {k.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Status" htmlFor="status" error={fe.status}>
          <Select id="status" name="status" defaultValue={state.values?.status ?? client?.status ?? "active"} {...err("status")}>
            {CLIENT_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Primary goal / focus" htmlFor="primaryGoal" optional error={fe.primaryGoal} className="sm:col-span-2" hint="In the client's own words works well, e.g. “Squat 180 lb by the end of October.”">
          <Textarea id="primaryGoal" name="primaryGoal" defaultValue={v("primaryGoal")} rows={3} maxLength={1000} {...err("primaryGoal")} />
        </Field>
      </div>

      <details open={moreOpen} className="group rounded-lg border border-border">
        <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-medium [&::-webkit-details-marker]:hidden">
          More details
          <ChevronDown className="size-4 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden />
        </summary>
        <div className="grid gap-4 border-t border-border p-4 sm:grid-cols-2">
          <Field label="Assessment date" htmlFor="assessmentDate" optional error={fe.assessmentDate}>
            <Input id="assessmentDate" name="assessmentDate" type="date" defaultValue={v("assessmentDate")} {...err("assessmentDate")} />
          </Field>
          <Field label="Next review date" htmlFor="nextReviewDate" optional error={fe.nextReviewDate}>
            <Input id="nextReviewDate" name="nextReviewDate" type="date" defaultValue={v("nextReviewDate")} {...err("nextReviewDate")} />
          </Field>
          <Field label="Training start date" htmlFor="startDate" optional error={fe.startDate}>
            <Input id="startDate" name="startDate" type="date" defaultValue={v("startDate")} {...err("startDate")} />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Session length" htmlFor="sessionLengthMin" optional error={fe.sessionLengthMin} hint="Minutes">
              <Input id="sessionLengthMin" name="sessionLengthMin" type="number" inputMode="numeric" min={5} max={240} step={5} defaultValue={v("sessionLengthMin")} {...err("sessionLengthMin")} />
            </Field>
            <Field label="Per week" htmlFor="sessionsPerWeek" optional error={fe.sessionsPerWeek} hint="Sessions">
              <Input id="sessionsPerWeek" name="sessionsPerWeek" type="number" inputMode="decimal" min={0.5} max={14} step={0.5} defaultValue={v("sessionsPerWeek")} {...err("sessionsPerWeek")} />
            </Field>
          </div>
          <Field label="Health notes & limitations" htmlFor="healthNotes" optional error={fe.healthNotes} className="sm:col-span-2" hint="Injuries, conditions or movements to avoid. Visible only to you.">
            <Textarea id="healthNotes" name="healthNotes" defaultValue={v("healthNotes")} rows={3} maxLength={2000} {...err("healthNotes")} />
          </Field>
          <Field label="Email" htmlFor="email" optional error={fe.email}>
            <Input id="email" name="email" type="email" autoComplete="off" defaultValue={v("email")} {...err("email")} />
          </Field>
          <Field label="Phone" htmlFor="phone" optional error={fe.phone}>
            <Input id="phone" name="phone" type="tel" autoComplete="off" defaultValue={v("phone")} {...err("phone")} />
          </Field>
        </div>
      </details>

      <div className="flex items-center justify-end gap-2">
        <Button asChild variant="ghost">
          <Link href={cancelHref}>Cancel</Link>
        </Button>
        <Button type="submit" loading={pending}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
