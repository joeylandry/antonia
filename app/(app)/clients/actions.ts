"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireTrainer } from "@/lib/auth";
import { clientSchema } from "@/lib/validation/client";
import { fieldErrorsFrom, textValues, type ActionState } from "@/lib/validation/shared";
import {
  completeReview,
  createClientRecord,
  deleteClientRecord,
  getClient,
  setClientArchived,
  updateClientRecord,
} from "@/lib/data/clients";
import { addDays, todayIn } from "@/lib/dates";

function parseClient(formData: FormData) {
  const raw: Record<string, FormDataEntryValue> = {};
  for (const [k, v] of formData.entries()) if (!k.startsWith("$ACTION")) raw[k] = v;
  return clientSchema.safeParse(raw);
}

export async function createClientAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const trainer = await requireTrainer();
  const parsed = parseClient(formData);
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error.issues), error: "Please fix the highlighted fields.", values: textValues(formData) };

  let id: string;
  try {
    id = await createClientRecord(trainer.id, parsed.data);
  } catch {
    return { error: "We couldn't save this client. Please try again.", values: textValues(formData) };
  }
  revalidatePath("/clients");
  revalidatePath("/");
  redirect(`/clients/${id}`);
}

export async function updateClientAction(id: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const trainer = await requireTrainer();
  const parsed = parseClient(formData);
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error.issues), error: "Please fix the highlighted fields.", values: textValues(formData) };

  let found: boolean;
  try {
    found = await updateClientRecord(trainer.id, id, parsed.data);
  } catch {
    return { error: "We couldn't save your changes. Please try again.", values: textValues(formData) };
  }
  if (!found) return { error: "This client no longer exists." };
  revalidatePath("/clients");
  revalidatePath(`/clients/${id}`, "layout");
  revalidatePath("/");
  redirect(`/clients/${id}`);
}

export async function setArchivedAction(id: string, archived: boolean): Promise<{ ok: boolean; error?: string }> {
  const trainer = await requireTrainer();
  try {
    const ok = await setClientArchived(trainer.id, id, archived);
    if (!ok) return { ok: false, error: "This client no longer exists." };
  } catch {
    return { ok: false, error: "Something went wrong. Please try again." };
  }
  revalidatePath("/clients");
  revalidatePath(`/clients/${id}`, "layout");
  revalidatePath("/");
  return { ok: true };
}

export async function deleteClientAction(id: string, confirmName: string): Promise<{ ok: boolean; error?: string }> {
  const trainer = await requireTrainer();
  const client = await getClient(trainer.id, id);
  if (!client) return { ok: false, error: "This client no longer exists." };
  if (confirmName.trim().toLowerCase() !== client.fullName.trim().toLowerCase()) {
    return { ok: false, error: "The name you typed doesn't match." };
  }
  try {
    await deleteClientRecord(trainer.id, id);
  } catch {
    return { ok: false, error: "Something went wrong. Please try again." };
  }
  revalidatePath("/clients");
  revalidatePath("/");
  return { ok: true };
}

/** Records that the review happened today and schedules the next one `weeks` ahead (or none). */
export async function completeReviewAction(id: string, weeks: number | null): Promise<{ ok: boolean; error?: string }> {
  const trainer = await requireTrainer();
  const today = todayIn(trainer.timezone);
  const next = weeks && weeks > 0 && weeks <= 52 ? addDays(today, weeks * 7) : null;
  try {
    const ok = await completeReview(trainer.id, id, today, next);
    if (!ok) return { ok: false, error: "This client no longer exists." };
  } catch {
    return { ok: false, error: "Something went wrong. Please try again." };
  }
  revalidatePath(`/clients/${id}`, "layout");
  revalidatePath("/");
  return { ok: true };
}
