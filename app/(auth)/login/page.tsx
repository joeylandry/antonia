import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { isDemo } from "@/lib/demo/mode";
import { Suspense } from "react";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  if (isDemo()) redirect("/");
  return (
    <>
      <h1 className="font-display text-3xl font-medium tracking-tight">Welcome back</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">Sign in to see your clients.</p>
      <Suspense>
        <LoginForm />
      </Suspense>
    </>
  );
}
