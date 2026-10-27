import { cn } from "@/lib/utils";

export function Stat({ label, value, sub, tone }: { label: string; value: React.ReactNode; sub?: React.ReactNode; tone?: "good" | "bad" | "neutral" }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5">
        <span className="tabular font-display text-2xl font-medium leading-none">{value}</span>
        {sub && (
          <span className={cn("ml-1.5 text-xs font-medium", tone === "good" && "text-success", tone === "bad" && "text-danger", (!tone || tone === "neutral") && "text-muted-foreground")}>
            {sub}
          </span>
        )}
      </dd>
    </div>
  );
}
