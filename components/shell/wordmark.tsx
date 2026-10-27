import { Dumbbell } from "lucide-react";

export function Wordmark() {
  return (
    <span className="flex items-center gap-2.5">
      <span aria-hidden className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
        <Dumbbell className="size-[1.15rem]" strokeWidth={2.25} />
      </span>
      <span className="font-display text-lg font-medium tracking-tight">FitnessTracker</span>
    </span>
  );
}
