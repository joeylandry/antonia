import { z } from "zod";
import { blankToUndefined, requiredDate } from "./shared";

const num = (min: number, max: number, int = false) =>
  z.preprocess(
    (v) => (v === "" || v === null || (typeof v === "number" && Number.isNaN(v)) ? undefined : v),
    (int ? z.coerce.number().int("Use a whole number.") : z.coerce.number()).min(min, `Must be at least ${min}.`).max(max, `Must be ${max} or less.`).optional(),
  );

export const setSchema = z.object({
  reps: num(0, 1000, true),
  weight: num(0, 2000),
  seconds: num(0, 7200, true),
});

export const entrySchema = z.object({
  exerciseName: z.string().trim().min(1, "Choose or type an exercise.").max(80, "Keep the name under 80 characters."),
  sets: z.array(setSchema).max(30, "That's a lot of sets — 30 maximum."),
  notes: z.preprocess(blankToUndefined, z.string().trim().max(2000).optional()),
});

export const sessionSchema = z.object({
  clientId: z.uuid(),
  sessionDate: requiredDate,
  focus: z.preprocess(blankToUndefined, z.string().trim().max(120, "Keep the focus under 120 characters.").optional()),
  notes: z.preprocess(blankToUndefined, z.string().trim().max(4000).optional()),
  entries: z.array(entrySchema).min(1, "Add at least one exercise.").max(40),
});

export type SessionInput = z.infer<typeof sessionSchema>;
export type SessionFormValues = z.input<typeof sessionSchema>;
