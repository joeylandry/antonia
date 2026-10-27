"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { FormBanner } from "@/components/forms/form-banner";
import { updatePasswordAction, type AuthFormState } from "@/app/(auth)/actions";

export function NewPasswordForm({ doneHref, doneLabel }: { doneHref: string; doneLabel: string }) {
  const [state, action, pending] = useActionState<AuthFormState, FormData>(updatePasswordAction, {});
  return (
    <form action={action} className="mt-8 space-y-4" noValidate>
      {state.error && <FormBanner tone="error">{state.error}</FormBanner>}
      {state.notice ? (
        <>
          <FormBanner tone="success">{state.notice}</FormBanner>
          <Button asChild size="lg" className="w-full">
            <Link href={doneHref}>{doneLabel}</Link>
          </Button>
        </>
      ) : (
        <>
          <Field label="New password" htmlFor="password" error={state.fieldErrors?.password}>
            <Input id="password" name="password" type="password" autoComplete="new-password" required aria-invalid={!!state.fieldErrors?.password} />
          </Field>
          <Field label="Confirm new password" htmlFor="confirm" error={state.fieldErrors?.confirm}>
            <Input id="confirm" name="confirm" type="password" autoComplete="new-password" required aria-invalid={!!state.fieldErrors?.confirm} />
          </Field>
          <Button type="submit" size="lg" className="w-full" loading={pending}>
            Update password
          </Button>
        </>
      )}
    </form>
  );
}
