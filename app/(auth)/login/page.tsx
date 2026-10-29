import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getTrainer } from "@/lib/auth";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Unlock" };

export default async function LoginPage() {
  if (await getTrainer()) redirect("/");
  return (
    <>
      <h1 className="font-display text-3xl font-medium tracking-tight">Welcome back</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">Enter the passcode to see your clients.</p>
      <Suspense>
        <LoginForm />
      </Suspense>
    </>
  );
}
