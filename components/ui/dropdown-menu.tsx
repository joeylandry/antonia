"use client";

import * as React from "react";
import { DropdownMenu as M } from "radix-ui";
import { cn } from "@/lib/utils";

export const DropdownMenu = M.Root;
export const DropdownMenuTrigger = M.Trigger;

export function DropdownMenuContent({ className, sideOffset = 6, ...props }: React.ComponentPropsWithoutRef<typeof M.Content>) {
  return (
    <M.Portal>
      <M.Content
        sideOffset={sideOffset}
        className={cn(
          "z-50 min-w-48 overflow-hidden rounded-md border border-border bg-surface-raised p-1 shadow-md",
          className,
        )}
        {...props}
      />
    </M.Portal>
  );
}

export function DropdownMenuItem({
  className,
  danger,
  ...props
}: React.ComponentPropsWithoutRef<typeof M.Item> & { danger?: boolean }) {
  return (
    <M.Item
      className={cn(
        "flex cursor-default select-none items-center gap-2 rounded-sm px-2.5 py-2 text-sm outline-none data-[disabled]:opacity-50 [&_svg]:size-4 [&_svg]:text-muted-foreground",
        danger
          ? "text-danger data-[highlighted]:bg-danger-soft [&_svg]:text-danger"
          : "text-foreground data-[highlighted]:bg-muted",
        className,
      )}
      {...props}
    />
  );
}

export function DropdownMenuLabel({ className, ...props }: React.ComponentPropsWithoutRef<typeof M.Label>) {
  return <M.Label className={cn("px-2.5 py-1.5 text-xs text-muted-foreground", className)} {...props} />;
}

export function DropdownMenuSeparator({ className, ...props }: React.ComponentPropsWithoutRef<typeof M.Separator>) {
  return <M.Separator className={cn("-mx-1 my-1 h-px bg-border", className)} {...props} />;
}
