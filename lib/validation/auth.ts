import { z } from "zod";

export const signInSchema = z.object({
  email: z.email("Enter a valid email address.").max(254),
  password: z.string().min(1, "Enter your password.").max(200),
});

export const emailSchema = z.object({
  email: z.email("Enter a valid email address.").max(254),
});

const newPassword = z.string().min(10, "Use at least 10 characters.").max(200, "That password is too long.");

export const newPasswordSchema = z
  .object({ password: newPassword, confirm: z.string() })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "Passwords don't match." });

export const signUpSchema = z
  .object({
    displayName: z.string().trim().min(1, "Enter your name.").max(80, "Keep your name under 80 characters."),
    email: z.email("Enter a valid email address.").max(254),
    password: newPassword,
    confirm: z.string(),
    // The browser's own zone; anything unrecognised falls back to the default.
    timezone: z.string().max(64).catch(""),
  })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "Passwords don't match." });

/**
 * Only allow same-site relative redirects after sign-in. Browsers strip tabs and
 * newlines from URLs, so "/\t/evil.com" would become "//evil.com"; reject any
 * control character and re-parse to prove the result stays on our own origin.
 */
export function safeNext(value: string | null | undefined, fallback = "/"): string {
  if (!value || !/^\/(?![/\\])[^\x00-\x20\x7f\\]*$/.test(value)) return fallback;
  try {
    const u = new URL(value, "http://same-origin.invalid");
    return u.origin === "http://same-origin.invalid" ? u.pathname + u.search + u.hash : fallback;
  } catch {
    return fallback;
  }
}
