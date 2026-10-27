import { cn } from "@/lib/utils";

const initials = (name: string) => {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "?") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
};

export function Avatar({ name, size = "md", className }: { name: string; size?: "md" | "lg"; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-primary-soft font-semibold text-primary-soft-foreground",
        size === "md" ? "size-9 text-xs" : "size-14 font-display text-xl font-medium",
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}
