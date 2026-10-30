import { z } from "zod";

export const passcodeSchema = z.object({
  passcode: z.string().min(1, "Enter the passcode.").max(200, "That passcode is too long."),
});

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
