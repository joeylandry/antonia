"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { FormBanner } from "@/components/forms/form-banner";
import { updateProfileAction } from "@/app/(app)/settings/actions";
import type { ActionState } from "@/lib/validation/shared";

export function ProfileForm({ displayName, timezone }: { displayName: string; timezone: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(updateProfileAction, {});
  const [tz, setTz] = useState(timezone);
  const zones = useMemo(() => {
    const all = typeof Intl.supportedValuesOf === "function" ? Intl.supportedValuesOf("timeZone") : [timezone];
    return all.includes(timezone) ? all : [timezone, ...all];
  }, [timezone]);
  const detected = typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : timezone;

  useEffect(() => {
    if (state.ok) toast.success("Settings saved");
  }, [state]);

  return (
    <form action={action} className="space-y-4" noValidate>
      {state.error && <FormBanner tone="error">{state.error}</FormBanner>}
      <Field label="Your name" htmlFor="displayName" error={state.fieldErrors?.displayName} hint="Shown in greetings.">
        <Input id="displayName" name="displayName" defaultValue={displayName} maxLength={80} autoComplete="name" />
      </Field>
      <Field label="Time zone" htmlFor="timezone" error={state.fieldErrors?.timezone} hint="Decides what “today” means for session dates and reminders.">
        <Select id="timezone" name="timezone" value={tz} onChange={(e) => setTz(e.target.value)}>
          {zones.map((z) => (
            <option key={z} value={z}>
              {z.replace(/_/g, " ")}
            </option>
          ))}
        </Select>
      </Field>
      {detected !== tz && (
        <button type="button" onClick={() => setTz(detected)} className="text-sm text-primary underline-offset-4 hover:underline">
          Use this device&apos;s time zone ({detected.replace(/_/g, " ")})
        </button>
      )}
      <div>
        <Button type="submit" loading={pending}>
          Save
        </Button>
      </div>
    </form>
  );
}
