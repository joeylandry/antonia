import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { isDemo } from "@/lib/demo/mode";
import Link from "next/link";
import { ForgotForm } from "./forgot-form";

export const metadata: Metadata = { title: "Reset password" };

export default function ForgotPasswordPage() {
  if (isDemo()) redirect("/");
  return (
    <>
      <h1 className="font-display text-3xl font-medium tracking-tight">Reset your password</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">
        Enter your email and we&apos;ll send you a link to choose a new password.
      </p>
      <ForgotForm />
      <p className="mt-6 text-center text-sm">
        <Link href="/login" className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
          Back to sign in
        </Link>
      </p>
    </>
  );
}
