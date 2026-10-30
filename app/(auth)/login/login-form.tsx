"use client";

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

  return (
    <form action={action} className="mt-8 space-y-4" noValidate>
      <input type="hidden" name="next" value={params.get("next") ?? ""} />
      {/* Lets password managers save the passcode under a stable name. */}
      <input type="hidden" name="username" autoComplete="username" value="antonia" />
      {state.error && <FormBanner tone="error">{state.error}</FormBanner>}
      <Field label="Passcode" htmlFor="passcode">
        <Input id="passcode" name="passcode" type="password" autoComplete="current-password" autoFocus required />
      </Field>
      <Button type="submit" size="lg" className="w-full" loading={pending}>
        Unlock
      </Button>
    </form>
  );
}
