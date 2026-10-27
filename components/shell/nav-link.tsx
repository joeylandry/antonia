"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function NavLink({
  href,
  label,
  icon,
  exact,
  variant,
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
  exact?: boolean;
  variant: "sidebar" | "tab";
}) {
  const pathname = usePathname();
  const active = exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      prefetch={false}
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        variant === "sidebar"
          ? "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors"
          : "flex flex-col items-center gap-1 py-2.5 text-[0.7rem] font-medium transition-colors",
        active
          ? variant === "sidebar"
            ? "bg-primary-soft text-primary-soft-foreground"
            : "text-primary"
          : "text-muted-foreground hover:text-foreground",
        variant === "sidebar" && !active && "hover:bg-muted",
      )}
    >
      <span aria-hidden className={variant === "sidebar" ? "[&_svg]:size-4" : "[&_svg]:size-5"}>
        {icon}
      </span>
      {label}
    </Link>
  );
}
