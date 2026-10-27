import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { isDemo } from "@/lib/demo/mode";
import { createClient } from "@/lib/supabase/server";
import { NewPasswordForm } from "@/components/forms/new-password-form";

export const metadata: Metadata = { title: "Choose a new password" };

export default async function ResetPasswordPage() {
  if (isDemo()) redirect("/");
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");
  return (
    <>
      <h1 className="font-display text-3xl font-medium tracking-tight">Choose a new password</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">Use at least 10 characters. A passphrase works well.</p>
      <NewPasswordForm doneHref="/" doneLabel="Continue" />
    </>
  );
}
