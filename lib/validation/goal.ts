import { z } from "zod";
import { blankToUndefined, optionalDate } from "./shared";

export const goalSchema = z
  .object({
    kind: z.enum(["lift", "general"]),
    title: z.string().trim().min(1, "Describe the goal.").max(200, "Keep it under 200 characters."),
    exerciseName: z.preprocess(blankToUndefined, z.string().trim().max(80).optional()),
    targetValue: z.preprocess(
      blankToUndefined,
      z.coerce.number({ error: "Enter a number." }).positive("Must be greater than 0.").max(5000).optional(),
    ),
    targetDate: optionalDate,
  })
  .superRefine((v, ctx) => {
    if (v.kind === "lift") {
      if (!v.exerciseName) ctx.addIssue({ code: "custom", path: ["exerciseName"], message: "Choose the exercise." });
      if (v.targetValue == null) ctx.addIssue({ code: "custom", path: ["targetValue"], message: "Enter the target weight." });
    }
  });

export type GoalInput = z.infer<typeof goalSchema>;

export const metricSchema = z.object({
  name: z.string().trim().min(1, "Name this measurement.").max(60),
  unit: z.preprocess((v) => (typeof v === "string" ? v.trim() : v), z.string().max(16, "Keep the unit short.").default("")),
  direction: z.enum(["up", "down", "neutral"]).default("neutral"),
});

export const metricEntrySchema = z.object({
  entryDate: z.iso.date("Enter a valid date."),
  value: z.coerce.number({ error: "Enter a number." }).min(-100000).max(100000),
  note: z.preprocess(blankToUndefined, z.string().trim().max(500).optional()),
});

export const noteSchema = z.object({
  body: z.string().trim().min(1, "Write something first.").max(5000, "Keep notes under 5,000 characters."),
});
