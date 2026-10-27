import { z } from "zod";

/** '' and whitespace become undefined so optional form inputs validate cleanly. */
export const blankToUndefined = (v: unknown) => (typeof v === "string" && v.trim() === "" ? undefined : v);

export const optionalText = (max: number, message = `Keep this under ${max} characters.`) =>
  z.preprocess(blankToUndefined, z.string().trim().max(max, message).optional());

export const optionalDate = z.preprocess(blankToUndefined, z.iso.date("Enter a valid date.").optional());

export const requiredDate = z.preprocess(blankToUndefined, z.iso.date("Enter a valid date."));

export const optionalInt = (min: number, max: number, label: string) =>
  z.preprocess(
    blankToUndefined,
    z.coerce.number({ error: `${label} must be a number.` }).int(`${label} must be a whole number.`).min(min, `${label} must be at least ${min}.`).max(max, `${label} must be ${max} or less.`).optional(),
  );

export const optionalDecimal = (min: number, max: number, label: string) =>
  z.preprocess(
    blankToUndefined,
    z.coerce.number({ error: `${label} must be a number.` }).min(min, `${label} must be at least ${min}.`).max(max, `${label} must be ${max} or less.`).optional(),
  );

export type ActionState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  ok?: boolean;
  /** Submitted text values, echoed back so React 19's post-action form reset can't wipe what the user typed. */
  values?: Record<string, string>;
};

/** Text fields of a FormData, minus Next's internal action fields. */
export function textValues(formData: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of formData.entries()) if (typeof v === "string" && !k.startsWith("$ACTION")) out[k] = v;
  return out;
}

export function fieldErrorsFrom(issues: { path: PropertyKey[]; message: string }[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of issues) {
    const key = issue.path.map(String).join(".") || "form";
    out[key] ??= issue.message;
  }
  return out;
}
