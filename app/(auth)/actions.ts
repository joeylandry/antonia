"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { isDemo } from "@/lib/demo/mode";
import { createClient } from "@/lib/supabase/server";
import { emailSchema, newPasswordSchema, safeNext, signInSchema } from "@/lib/validation/auth";

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

export async function signOutAction() {
  if (isDemo()) redirect("/");
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
