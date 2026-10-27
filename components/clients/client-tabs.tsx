"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function ClientTabs({ clientId }: { clientId: string }) {
  const pathname = usePathname();
  const base = `/clients/${clientId}`;
  const tabs = [
    { href: base, label: "Overview", exact: true },
    { href: `${base}/sessions`, label: "Sessions" },
    { href: `${base}/progress`, label: "Progress" },
    { href: `${base}/goals`, label: "Goals" },
    { href: `${base}/notes`, label: "Notes" },
  ];
  return (
    <nav aria-label="Client sections" data-print-hide className="-mx-4 overflow-x-auto border-b border-border px-4 scrollbar-thin sm:mx-0 sm:px-0">
      <ul className="flex min-w-max gap-1">
        {tabs.map((t) => {
          const active = t.exact ? pathname === t.href : pathname === t.href || pathname.startsWith(`${t.href}/`);
          return (
            <li key={t.href}>
              <Link
                href={t.href}
                prefetch={false}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative inline-block px-2.5 py-2.5 sm:px-3 text-sm font-medium transition-colors",
                  active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {t.label}
                {active && <span aria-hidden className="absolute inset-x-2.5 -bottom-px sm:inset-x-3 h-0.5 rounded-full bg-primary" />}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
