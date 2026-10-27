"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { FormBanner } from "@/components/forms/form-banner";
import { signInAction, type AuthFormState } from "../actions";

export function LoginForm() {
  const params = useSearchParams();
  const [state, action, pending] = useActionState<AuthFormState, FormData>(signInAction, {});
  const linkExpired = params.get("error") === "link";

  return (
    <form action={action} className="mt-8 space-y-4" noValidate>
      <input type="hidden" name="next" value={params.get("next") ?? ""} />
      {linkExpired && !state.error && (
        <FormBanner tone="error">That link has expired or was already used. Request a new one below.</FormBanner>
      )}
      {state.error && <FormBanner tone="error">{state.error}</FormBanner>}
      <Field label="Email" htmlFor="email" error={state.fieldErrors?.email}>
        <Input id="email" name="email" type="email" autoComplete="email" required aria-invalid={!!state.fieldErrors?.email} aria-describedby={state.fieldErrors?.email ? "email-error" : undefined} />
      </Field>
      <Field label="Password" htmlFor="password" error={state.fieldErrors?.password}>
        <Input id="password" name="password" type="password" autoComplete="current-password" required aria-invalid={!!state.fieldErrors?.password} aria-describedby={state.fieldErrors?.password ? "password-error" : undefined} />
      </Field>
      <Button type="submit" size="lg" className="w-full" loading={pending}>
        Sign in
      </Button>
      <p className="text-center text-sm">
        <Link href="/forgot-password" className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
          Forgot your password?
        </Link>
      </p>
    </form>
  );
}
