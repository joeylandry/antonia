"use client";

import { RANGES, type RangeKey } from "@/lib/domain/progress";
import { cn } from "@/lib/utils";

export function RangeTabs({ value, onChange }: { value: RangeKey; onChange: (v: RangeKey) => void }) {
  return (
    <div role="group" aria-label="Date range" className="inline-flex rounded-md border border-border bg-muted p-0.5">
      {RANGES.map((r) => (
        <button
          key={r.key}
          type="button"
          aria-pressed={value === r.key}
          onClick={() => onChange(r.key)}
          className={cn(
            "rounded-[5px] px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground",
            value === r.key && "bg-surface text-foreground shadow-sm",
          )}
        >
          {r.label}
        </button>
      ))}
    </div>
  );
}
