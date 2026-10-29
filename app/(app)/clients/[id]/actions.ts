"use server";

import { revalidatePath } from "next/cache";
import { requireTrainer } from "@/lib/auth";
import { todayIn } from "@/lib/dates";
import { fieldErrorsFrom, type ActionState } from "@/lib/validation/shared";
import { sessionSchema } from "@/lib/validation/session";
import { goalSchema, metricEntrySchema, metricSchema, noteSchema } from "@/lib/validation/goal";
import { deleteSessionRecord, saveSession } from "@/lib/data/sessions";
import { createGoal, deleteGoal, setGoalStatus, updateGoal } from "@/lib/data/goals";
import { createMetric, deleteMetric, deleteMetricEntry, upsertMetricEntry } from "@/lib/data/metrics";
import { createNote, deleteNote, updateNote } from "@/lib/data/notes";
import type { GoalStatus } from "@/lib/domain/types";

export type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string; fieldErrors?: Record<string, string> };

const GENERIC = "Something went wrong. Please try again.";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function refresh(clientId: string) {
  revalidatePath(`/clients/${clientId}`, "layout");
  revalidatePath("/clients");
  revalidatePath("/");
}

// ---- sessions -------------------------------------------------------------

export async function saveSessionAction(sessionId: string | null, values: unknown): Promise<Result<{ id: string; clientId: string }>> {
  await requireTrainer();
  const parsed = sessionSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: "Please fix the highlighted fields.", fieldErrors: fieldErrorsFrom(parsed.error.issues) };
  }
  if (sessionId && !UUID.test(sessionId)) return { ok: false, error: "This session no longer exists." };
  try {
    const id = await saveSession(parsed.data, sessionId ?? undefined);
    if (!id) return { ok: false, error: "This session no longer exists." };
    refresh(parsed.data.clientId);
    return { ok: true, id, clientId: parsed.data.clientId };
  } catch (e) {
    // A bad client id surfaces as a foreign-key error.
    console.error("saveSession failed", e instanceof Error ? e.message : e);
    return { ok: false, error: "We couldn't save this session. Please try again." };
  }
}

export async function deleteSessionAction(clientId: string, sessionId: string): Promise<Result> {
  await requireTrainer();
  if (!UUID.test(sessionId)) return { ok: false, error: GENERIC };
  try {
    if (!(await deleteSessionRecord(sessionId))) return { ok: false, error: "This session no longer exists." };
  } catch {
    return { ok: false, error: GENERIC };
  }
  refresh(clientId);
  return { ok: true };
}

// ---- goals ----------------------------------------------------------------

export async function saveGoalAction(clientId: string, goalId: string | null, values: unknown): Promise<Result> {
  await requireTrainer();
  const parsed = goalSchema.safeParse(values);
  if (!parsed.success) return { ok: false, error: "Please fix the highlighted fields.", fieldErrors: fieldErrorsFrom(parsed.error.issues) };
  try {
    if (goalId) {
      if (!UUID.test(goalId) || !(await updateGoal(goalId, parsed.data))) return { ok: false, error: "This goal no longer exists." };
    } else {
      await createGoal(clientId, parsed.data);
    }
  } catch {
    return { ok: false, error: GENERIC };
  }
  refresh(clientId);
  return { ok: true };
}

export async function setGoalStatusAction(clientId: string, goalId: string, status: GoalStatus): Promise<Result> {
  const trainer = await requireTrainer();
  if (!UUID.test(goalId) || !["active", "achieved", "dropped"].includes(status)) return { ok: false, error: GENERIC };
  try {
    if (!(await setGoalStatus(goalId, status, todayIn(trainer.timezone)))) return { ok: false, error: "This goal no longer exists." };
  } catch {
    return { ok: false, error: GENERIC };
  }
  refresh(clientId);
  return { ok: true };
}

export async function deleteGoalAction(clientId: string, goalId: string): Promise<Result> {
  await requireTrainer();
  if (!UUID.test(goalId)) return { ok: false, error: GENERIC };
  try {
    if (!(await deleteGoal(goalId))) return { ok: false, error: "This goal no longer exists." };
  } catch {
    return { ok: false, error: GENERIC };
  }
  refresh(clientId);
  return { ok: true };
}

// ---- measurements ---------------------------------------------------------

export async function createMetricAction(clientId: string, values: unknown): Promise<Result> {
  await requireTrainer();
  const parsed = metricSchema.safeParse(values);
  if (!parsed.success) return { ok: false, error: "Please fix the highlighted fields.", fieldErrors: fieldErrorsFrom(parsed.error.issues) };
  try {
    await createMetric(clientId, parsed.data);
  } catch (e) {
    const dup = e instanceof Error && /metrics_client_name_idx|duplicate/.test(e.message);
    return { ok: false, error: dup ? "You're already tracking a measurement with that name." : GENERIC };
  }
  refresh(clientId);
  return { ok: true };
}

export async function deleteMetricAction(clientId: string, metricId: string): Promise<Result> {
  await requireTrainer();
  if (!UUID.test(metricId)) return { ok: false, error: GENERIC };
  try {
    if (!(await deleteMetric(metricId))) return { ok: false, error: "This measurement no longer exists." };
  } catch {
    return { ok: false, error: GENERIC };
  }
  refresh(clientId);
  return { ok: true };
}

export async function saveMetricEntryAction(clientId: string, metricId: string, values: unknown): Promise<Result> {
  await requireTrainer();
  const parsed = metricEntrySchema.safeParse(values);
  if (!parsed.success) return { ok: false, error: "Please fix the highlighted fields.", fieldErrors: fieldErrorsFrom(parsed.error.issues) };
  if (!UUID.test(metricId)) return { ok: false, error: GENERIC };
  try {
    if (!(await upsertMetricEntry(metricId, parsed.data))) return { ok: false, error: "This measurement no longer exists." };
  } catch {
    return { ok: false, error: GENERIC };
  }
  refresh(clientId);
  return { ok: true };
}

export async function deleteMetricEntryAction(clientId: string, entryId: string): Promise<Result> {
  await requireTrainer();
  if (!UUID.test(entryId)) return { ok: false, error: GENERIC };
  try {
    if (!(await deleteMetricEntry(entryId))) return { ok: false, error: "This reading no longer exists." };
  } catch {
    return { ok: false, error: GENERIC };
  }
  refresh(clientId);
  return { ok: true };
}

// ---- notes ----------------------------------------------------------------

export async function saveNoteAction(clientId: string, noteId: string | null, _prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireTrainer();
  const parsed = noteSchema.safeParse({ body: String(formData.get("body") ?? "") });
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error.issues) };
  try {
    if (noteId) {
      if (!UUID.test(noteId) || !(await updateNote(noteId, parsed.data.body))) return { error: "This note no longer exists." };
    } else {
      await createNote(clientId, parsed.data.body);
    }
  } catch {
    return { error: GENERIC };
  }
  refresh(clientId);
  return { ok: true };
}

export async function deleteNoteAction(clientId: string, noteId: string): Promise<Result> {
  await requireTrainer();
  if (!UUID.test(noteId)) return { ok: false, error: GENERIC };
  try {
    if (!(await deleteNote(noteId))) return { ok: false, error: "This note no longer exists." };
  } catch {
    return { ok: false, error: GENERIC };
  }
  refresh(clientId);
  return { ok: true };
}
