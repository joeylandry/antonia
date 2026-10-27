import { daysBetween } from "@/lib/dates";
import type { ClientStatus } from "./types";

export type Health = "on_track" | "watch" | "overdue" | "new" | "paused";

/** Days without a session before a client is flagged amber, then red. */
export const WATCH_AFTER_DAYS = 10;
export const OVERDUE_AFTER_DAYS = 21;

export const HEALTH_LABEL: Record<Health, string> = {
  on_track: "On track",
  watch: "Check in soon",
  overdue: "Needs attention",
  new: "New, no sessions yet",
  paused: "Not currently training",
};

/**
 * One traffic-light per client, from facts Antonia already records:
 *  - green  trained recently and no review is due
 *  - amber  a review is due within a week, or 10+ days since the last session
 *  - red    a review is overdue, or 21+ days since the last session
 *  - grey   on hold / inactive / archived, or brand new with nothing logged yet
 */
export function clientHealth(
  c: { status: ClientStatus; archivedAt: Date | null; lastSessionDate: string | null; nextReviewDate: string | null },
  today: string,
): Health {
  if (c.archivedAt || c.status !== "active") return "paused";
  if (!c.lastSessionDate) return "new";
  const since = daysBetween(c.lastSessionDate, today);
  const reviewIn = c.nextReviewDate ? daysBetween(today, c.nextReviewDate) : null;
  if ((reviewIn != null && reviewIn < 0) || since >= OVERDUE_AFTER_DAYS) return "overdue";
  if ((reviewIn != null && reviewIn <= 7) || since >= WATCH_AFTER_DAYS) return "watch";
  return "on_track";
}
