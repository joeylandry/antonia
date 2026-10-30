"use server";

import { redirect } from "next/navigation";
import { signIn, signOut } from "@/lib/auth";
import { passcodeSchema, safeNext } from "@/lib/validation/auth";

export type AuthFormState = {
  error?: string;
};

export async function signInAction(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = passcodeSchema.safeParse({ passcode: String(formData.get("passcode") ?? "") });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const result = await signIn(parsed.data.passcode);
  if (result === "locked") return { error: "Too many wrong attempts. Sign-in is paused for 15 minutes." };
  if (result === "not_configured") return { error: "No passcode is set up yet. See README → Set the passcode." };
  if (result === "wrong") return { error: "That passcode isn't right. Please try again." };
  redirect(safeNext(String(formData.get("next") ?? "")));
}

export async function signOutAction() {
  await signOut();
  redirect("/login");
}
