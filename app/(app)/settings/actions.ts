"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireTrainer } from "@/lib/auth";
import { updateProfile } from "@/lib/data/profile";
import { fieldErrorsFrom, type ActionState } from "@/lib/validation/shared";

const profileSchema = z.object({
  displayName: z.string().trim().max(80, "Keep your name under 80 characters."),
  timezone: z.string().refine((tz) => {
    try {
      new Intl.DateTimeFormat("en-US", { timeZone: tz });
      return true;
    } catch {
      return false;
    }
  }, "Choose a valid time zone."),
});

export async function updateProfileAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireTrainer();
  const parsed = profileSchema.safeParse({ displayName: formData.get("displayName") ?? "", timezone: formData.get("timezone") ?? "" });
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error.issues) };
  try {
    await updateProfile(parsed.data);
  } catch {
    return { error: "We couldn't save your settings. Please try again." };
  }
  revalidatePath("/", "layout");
  return { ok: true };
}
