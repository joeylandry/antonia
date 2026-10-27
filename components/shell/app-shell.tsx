import Link from "next/link";
import { LayoutDashboard, Users, Settings } from "lucide-react";
import { NavLink } from "./nav-link";
import { UserMenu } from "./user-menu";
import { Wordmark } from "./wordmark";
import type { Trainer } from "@/lib/auth";

const nav = [
  { href: "/", label: "Today", icon: <LayoutDashboard />, exact: true },
  { href: "/clients", label: "Clients", icon: <Users /> },
  { href: "/settings", label: "Settings", icon: <Settings /> },
] as const;

export function AppShell({ trainer, demo, children }: { trainer: Trainer; demo?: boolean; children: React.ReactNode }) {
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[15rem_1fr]">
      <aside
        data-print-hide
        className="hidden border-r border-border bg-surface lg:sticky lg:top-0 lg:flex lg:h-dvh lg:flex-col"
      >
        <div className="px-5 pb-4 pt-6">
          <Link href="/" prefetch={false} className="inline-block">
            <Wordmark />
          </Link>
        </div>
        <nav aria-label="Primary" className="flex flex-1 flex-col gap-0.5 px-3">
          {nav.map((item) => (
            <NavLink key={item.href} {...item} variant="sidebar" />
          ))}
        </nav>
        <div className="border-t border-border p-3">
          <UserMenu trainer={trainer} />
        </div>
      </aside>

      <div className="flex min-w-0 flex-col pb-20 lg:pb-0">
        {demo && (
          <div data-print-hide className="border-b border-warning/30 bg-warning-soft px-4 py-2 text-center text-xs text-warning">
            <strong className="font-semibold">Demo</strong> · sample clients and numbers, nothing real. Changes reset when the server restarts.
          </div>
        )}
        <header
          data-print-hide
          className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-background/90 px-4 backdrop-blur lg:hidden"
        >
          <Link href="/" prefetch={false}>
            <Wordmark />
          </Link>
          <UserMenu trainer={trainer} compact />
        </header>
        <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
          {children}
        </main>
      </div>

      <nav
        data-print-hide
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-3 border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
      >
        {nav.map((item) => (
          <NavLink key={item.href} {...item} variant="tab" />
        ))}
      </nav>
    </div>
  );
}
