import { z } from "zod";
import { optionalDate, optionalDecimal, optionalInt, optionalText } from "./shared";

export const clientSchema = z.object({
  fullName: z.string().trim().min(1, "Enter the client's name.").max(120, "That name is too long."),
  kind: z.enum(["personal_training", "fitness_assessment"], { error: "Choose a client type." }),
  status: z.enum(["active", "on_hold", "inactive"], { error: "Choose a status." }).default("active"),
  primaryGoal: optionalText(1000),
  healthNotes: optionalText(2000),
  email: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z.email("Enter a valid email address.").max(254).optional(),
  ),
  phone: optionalText(40),
  startDate: optionalDate,
  assessmentDate: optionalDate,
  nextReviewDate: optionalDate,
  sessionLengthMin: optionalInt(5, 240, "Session length"),
  sessionsPerWeek: optionalDecimal(0.5, 14, "Sessions per week"),
});

export type ClientInput = z.infer<typeof clientSchema>;
