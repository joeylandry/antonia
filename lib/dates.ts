/**
 * Calendar dates are 'YYYY-MM-DD' strings end to end (database, forms, charts).
 * They are never converted through Date in the local zone, so they cannot shift
 * by a day. "Today" is computed in the trainer's own time zone.
 */

export function todayIn(timeZone: string, now: Date = new Date()): string {
  try {
    const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
    return parts; // en-CA formats as YYYY-MM-DD
  } catch {
    return now.toISOString().slice(0, 10);
  }
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function parseYmd(ymd: string): { y: number; m: number; d: number } {
  const [y, m, d] = ymd.split("-").map(Number);
  return { y, m, d };
}

/** Whole days from a to b (b - a). Uses UTC arithmetic on the calendar dates. */
export function daysBetween(a: string, b: string): number {
  const pa = parseYmd(a);
  const pb = parseYmd(b);
  return Math.round((Date.UTC(pb.y, pb.m - 1, pb.d) - Date.UTC(pa.y, pa.m - 1, pa.d)) / 86_400_000);
}

export function addDays(ymd: string, days: number): string {
  const { y, m, d } = parseYmd(ymd);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/** "Oct 6, 2026" (year omitted when it equals `currentYear`, if provided). */
export function formatDate(ymd: string | null | undefined, currentYear?: number): string {
  if (!ymd) return "—";
  const { y, m, d } = parseYmd(ymd);
  return currentYear === y ? `${MONTHS[m - 1]} ${d}` : `${MONTHS[m - 1]} ${d}, ${y}`;
}

export function formatShortDate(ymd: string): string {
  const { m, d } = parseYmd(ymd);
  return `${MONTHS[m - 1]} ${d}`;
}

/** "today", "yesterday", "3 days ago", "in 5 days", relative to `today`. */
export function relativeDay(ymd: string, today: string): string {
  const diff = daysBetween(today, ymd);
  if (diff === 0) return "today";
  if (diff === -1) return "yesterday";
  if (diff === 1) return "tomorrow";
  if (diff < 0) return `${-diff} days ago`;
  return `in ${diff} days`;
}
