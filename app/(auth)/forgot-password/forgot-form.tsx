"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { FormBanner } from "@/components/forms/form-banner";
import { requestPasswordResetAction, type AuthFormState } from "../actions";

export function ForgotForm() {
  const [state, action, pending] = useActionState<AuthFormState, FormData>(requestPasswordResetAction, {});
  return (
    <form action={action} className="mt-8 space-y-4" noValidate>
      {state.error && <FormBanner tone="error">{state.error}</FormBanner>}
      {state.notice && <FormBanner tone="success">{state.notice}</FormBanner>}
      <Field label="Email" htmlFor="email" error={state.fieldErrors?.email}>
        <Input id="email" name="email" type="email" autoComplete="email" required aria-invalid={!!state.fieldErrors?.email} aria-describedby={state.fieldErrors?.email ? "email-error" : undefined} />
      </Field>
      <Button type="submit" size="lg" className="w-full" loading={pending}>
        Send reset link
      </Button>
    </form>
  );
}
