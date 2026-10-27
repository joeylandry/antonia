import { HEALTH_LABEL, type Health } from "@/lib/domain/status";
import { cn } from "@/lib/utils";

const COLOR: Record<Health, string> = {
  on_track: "bg-success",
  watch: "bg-warning",
  overdue: "bg-danger",
  new: "bg-info",
  paused: "bg-border-strong",
};

/** A small status light. The label is available to screen readers and on hover. */
export function HealthDot({ health, className }: { health: Health; className?: string }) {
  return (
    <span title={HEALTH_LABEL[health]} className={cn("inline-flex", className)}>
      <span aria-hidden className={cn("size-2.5 rounded-full ring-2 ring-surface", COLOR[health], health === "on_track" && "shadow-[0_0_0_3px_color-mix(in_srgb,var(--success)_22%,transparent)]")} />
      <span className="sr-only">{HEALTH_LABEL[health]}</span>
    </span>
  );
}
