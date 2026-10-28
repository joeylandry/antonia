"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { emailSchema, newPasswordSchema, safeNext, signInSchema, signUpSchema } from "@/lib/validation/auth";

export type AuthFormState = {
  email?: string;
  error?: string;
  fieldErrors?: Record<string, string>;
  notice?: string;
};

function fieldErrors(issues: { path: PropertyKey[]; message: string }[]) {
  const out: Record<string, string> = {};
  for (const issue of issues) {
    const key = String(issue.path[0] ?? "form");
    out[key] ??= issue.message;
  }
  return out;
}

export async function signInAction(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = signInSchema.safeParse({
    email: String(formData.get("email") ?? "").trim(),
    password: String(formData.get("password") ?? ""),
  });
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error.issues), email: String(formData.get("email") ?? "") };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    // Deliberately vague: never reveal whether the email exists.
    const rateLimited = error.status === 429;
    return {
      email: parsed.data.email,
      error: rateLimited
        ? "Too many attempts. Please wait a few minutes and try again."
        : "That email and password don't match. Please try again.",
    };
  }
  redirect(safeNext(String(formData.get("next") ?? "")));
}

function validTimezone(tz: string) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return Boolean(tz);
  } catch {
    return false;
  }
}

export async function signUpAction(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "").trim();
  const parsed = signUpSchema.safeParse({
    displayName: String(formData.get("displayName") ?? ""),
    email,
    password: String(formData.get("password") ?? ""),
    confirm: String(formData.get("confirm") ?? ""),
    timezone: String(formData.get("timezone") ?? ""),
  });
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error.issues), email };

  const { displayName, password, timezone } = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password,
    options: {
      data: { display_name: displayName, ...(validTimezone(timezone) ? { timezone } : {}) },
      emailRedirectTo: `${await siteUrl()}/auth/confirm?next=/`,
    },
  });
  if (error) {
    const message =
      error.status === 429
        ? "Too many attempts. Please wait a few minutes and try again."
        : error.code === "user_already_exists" || error.code === "email_exists"
          ? "An account with that email already exists. Sign in instead."
          : error.code === "signup_disabled"
            ? "New accounts can't be created right now."
            : error.code === "weak_password"
              ? "Choose a stronger password."
              : "We couldn't create your account. Please try again.";
    return { email, error: message };
  }
  // With email confirmation on, Supabase returns no session until the link is clicked.
  if (data.session) redirect("/");
  return { email, notice: "Check your email for a link to confirm your account, then sign in." };
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

/**
 * Origin used in password-reset emails. Never derived from request headers in
 * production, where a forged Host header could aim the email at another site.
 */
async function siteUrl() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) return configured.replace(/\/$/, "");
  if (process.env.NODE_ENV === "production") throw new Error("NEXT_PUBLIC_SITE_URL must be set in production.");
  const h = await headers();
  return `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
}

export async function requestPasswordResetAction(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = emailSchema.safeParse({ email: String(formData.get("email") ?? "").trim() });
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error.issues), email: String(formData.get("email") ?? "") };

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${await siteUrl()}/auth/confirm?next=/reset-password`,
  });
  if (error?.status === 429) {
    return { email: parsed.data.email, error: "Too many requests. Please wait a few minutes and try again." };
  }
  // Same response whether or not the address has an account.
  return { email: parsed.data.email, notice: "If that email has an account, a reset link is on its way. It can take a minute to arrive." };
}

export async function updatePasswordAction(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = newPasswordSchema.safeParse({
    password: String(formData.get("password") ?? ""),
    confirm: String(formData.get("confirm") ?? ""),
  });
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error.issues) };

  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    return { error: error.message.length < 160 ? error.message : "We couldn't update your password. Please try again." };
  }
  return { notice: "Your password has been updated." };
}
