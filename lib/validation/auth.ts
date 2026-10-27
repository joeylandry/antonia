import { z } from "zod";

export const signInSchema = z.object({
  email: z.email("Enter a valid email address.").max(254),
  password: z.string().min(1, "Enter your password.").max(200),
});

export const emailSchema = z.object({
  email: z.email("Enter a valid email address.").max(254),
});

export const newPasswordSchema = z
  .object({
    password: z
      .string()
      .min(10, "Use at least 10 characters.")
      .max(200, "That password is too long."),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "Passwords don't match." });

/** Only allow same-site relative redirects after sign-in. */
export function safeNext(value: string | null | undefined, fallback = "/"): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return fallback;
  return value;
}
