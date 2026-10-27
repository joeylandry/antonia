import { HEALTH_LABEL, type Health } from "@/lib/domain/status";
import { cn } from "@/lib/utils";

const COLOR: Record<Health, string> = {
  on_track: "bg-success",
  watch: "bg-warning",
  overdue: "bg-danger",
  new: "bg-info",
  paused: "bg-border-strong",
};

/** A small status light. The label is available to screen readers and on hover, unless `decorative` (text already says it). */
export function HealthDot({ health, className, decorative }: { health: Health; className?: string; decorative?: boolean }) {
  return (
    <span title={decorative ? undefined : HEALTH_LABEL[health]} className={cn("inline-flex", className)}>
      <span aria-hidden className={cn("size-2.5 rounded-full ring-2 ring-surface", COLOR[health])} />
      {!decorative && <span className="sr-only">{HEALTH_LABEL[health]}</span>}
    </span>
  );
}
