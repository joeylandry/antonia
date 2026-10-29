"use client";

import Link from "next/link";
import { useTransition } from "react";
import { ChevronsUpDown, LogOut, Settings } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { signOutAction } from "@/app/(auth)/actions";
import type { Trainer } from "@/lib/auth";
import { cn } from "@/lib/utils";

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "?") + (parts.length > 1 ? parts[1][0] : "")).toUpperCase();
}

export function UserMenu({ trainer, compact }: { trainer: Trainer; compact?: boolean }) {
  const [, startTransition] = useTransition();
  const label = trainer.displayName || "Signed in";
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "flex items-center gap-2.5 rounded-md text-left outline-none transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring",
          compact ? "p-1" : "w-full p-2",
        )}
        aria-label="Account menu"
      >
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary-soft text-xs font-semibold text-primary-soft-foreground">
          {initials(trainer.displayName)}
        </span>
        {!compact && (
          <>
            <span className="min-w-0 flex-1 truncate text-sm font-medium">{label}</span>
            <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          </>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align={compact ? "end" : "start"} side={compact ? "bottom" : "top"} className="w-60">
        <DropdownMenuLabel>{label}</DropdownMenuLabel>
        <div className="flex items-center justify-between px-2.5 py-1.5">
          <span className="text-sm">Theme</span>
          <ThemeToggle />
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/settings">
            <Settings /> Settings
          </Link>
        </DropdownMenuItem>
        {/* Not a <form>: Radix unmounts the menu on select, which would cancel a form submit. */}
        <DropdownMenuItem onSelect={() => startTransition(() => signOutAction())}>
          <LogOut /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
