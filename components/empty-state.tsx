import { cn } from "@/lib/utils";

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center rounded-lg border border-dashed border-border-strong px-6 py-12 text-center", className)}>
      {icon && <div className="mb-3 flex size-10 items-center justify-center rounded-full bg-primary-soft text-primary-soft-foreground [&_svg]:size-5">{icon}</div>}
      <h3 className="font-display text-lg font-medium">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
