import { Badge } from "@/components/ui/badge";
import { daysBetween, formatDate } from "@/lib/dates";
import { statusLabel, type ClientStatus } from "@/lib/domain/types";

export function StatusBadge({ status }: { status: ClientStatus }) {
  if (status === "active") return null;
  return <Badge tone={status === "on_hold" ? "warning" : "neutral"}>{statusLabel(status)}</Badge>;
}

export type ReviewState = "overdue" | "soon" | "scheduled" | "none";

export function reviewState(nextReviewDate: string | null, today: string): ReviewState {
  if (!nextReviewDate) return "none";
  const diff = daysBetween(today, nextReviewDate);
  if (diff < 0) return "overdue";
  if (diff <= 7) return "soon";
  return "scheduled";
}

export function ReviewBadge({ nextReviewDate, today }: { nextReviewDate: string | null; today: string }) {
  const state = reviewState(nextReviewDate, today);
  if (state === "none" || !nextReviewDate) return null;
  const year = Number(today.slice(0, 4));
  if (state === "overdue") return <Badge tone="danger">Review overdue · {formatDate(nextReviewDate, year)}</Badge>;
  if (state === "soon") return <Badge tone="warning">Review {formatDate(nextReviewDate, year)}</Badge>;
  return null;
}
