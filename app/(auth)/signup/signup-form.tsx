"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { FormBanner } from "@/components/forms/form-banner";
import { signUpAction, type AuthFormState } from "../actions";

export function SignUpForm() {
  const [state, action, pending] = useActionState<AuthFormState, FormData>(signUpAction, {});
  const err = state.fieldErrors ?? {};
  const describedBy = (name: string) => (err[name] ? `${name}-error` : undefined);

  if (state.notice) {
    return (
      <div className="mt-8">
        <FormBanner tone="success">{state.notice}</FormBanner>
      </div>
    );
  }

  // Start the new account in this device's time zone; it can be changed in Settings.
  const submit = (formData: FormData) => {
    formData.set("timezone", Intl.DateTimeFormat().resolvedOptions().timeZone ?? "");
    return action(formData);
  };

  return (
    <form action={submit} className="mt-8 space-y-4" noValidate>
      {state.error && <FormBanner tone="error">{state.error}</FormBanner>}
      <Field label="Your name" htmlFor="displayName" error={err.displayName}>
        <Input id="displayName" name="displayName" autoComplete="name" required aria-invalid={!!err.displayName} aria-describedby={describedBy("displayName")} />
      </Field>
      <Field label="Email" htmlFor="email" error={err.email}>
        <Input id="email" name="email" type="email" autoComplete="email" defaultValue={state.email ?? ""} required aria-invalid={!!err.email} aria-describedby={describedBy("email")} />
      </Field>
      <Field label="Password" htmlFor="password" error={err.password} hint="At least 10 characters.">
        <Input id="password" name="password" type="password" autoComplete="new-password" required aria-invalid={!!err.password} aria-describedby={describedBy("password")} />
      </Field>
      <Field label="Confirm password" htmlFor="confirm" error={err.confirm}>
        <Input id="confirm" name="confirm" type="password" autoComplete="new-password" required aria-invalid={!!err.confirm} aria-describedby={describedBy("confirm")} />
      </Field>
      <Button type="submit" size="lg" className="w-full" loading={pending}>
        Create account
      </Button>
    </form>
  );
}
