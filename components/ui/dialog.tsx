"use client";

import * as React from "react";
import { Dialog as D, AlertDialog as AD } from "radix-ui";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./button";

export const Dialog = D.Root;
export const DialogTrigger = D.Trigger;
export const DialogClose = D.Close;

/**
 * Dialog content that focuses its first field on open and returns focus to the
 * element that opened it on close. Rendered inside the portal, so it only mounts
 * (and captures the opener) when the dialog actually opens.
 */
function FocusReturnContent(props: React.ComponentPropsWithoutRef<typeof D.Content>) {
  const [opener] = React.useState(() => document.activeElement as HTMLElement | null);
  return (
    <D.Content
      onOpenAutoFocus={(e) => {
        const first = (e.currentTarget as HTMLElement).querySelector<HTMLElement>("input:not([type=hidden]), textarea, select");
        if (first) {
          e.preventDefault();
          first.focus();
        }
      }}
      onCloseAutoFocus={(e) => {
        if (opener && document.contains(opener)) {
          e.preventDefault();
          opener.focus();
        }
      }}
      {...props}
    />
  );
}

const overlay =
  "fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px] animate-fade-in";

export function DialogContent({
  className,
  children,
  title,
  description,
  ...props
}: React.ComponentPropsWithoutRef<typeof D.Content> & { title: string; description?: string }) {
  return (
    <D.Portal>
      <D.Overlay className={overlay} />
      <FocusReturnContent
        className={cn(
          "fixed left-1/2 top-1/2 z-50 max-h-[90dvh] w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-lg border border-border bg-surface-raised p-6 shadow-md",
          className,
        )}
        {...props}
      >
        <div className="mb-4 pr-6">
          <D.Title className="font-display text-xl font-medium">{title}</D.Title>
          {description ? (
            <D.Description className="mt-1 text-sm text-muted-foreground">{description}</D.Description>
          ) : (
            <D.Description className="sr-only">{title}</D.Description>
          )}
        </div>
        {children}
        <D.Close
          className="absolute right-3 top-3 rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Close"
        >
          <X className="size-4" />
        </D.Close>
      </FocusReturnContent>
    </D.Portal>
  );
}

/** Confirmation prompt for destructive or hard-to-undo actions. */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  tone = "danger",
  loading,
  onConfirm,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  tone?: "danger" | "primary";
  loading?: boolean;
  onConfirm: () => void;
  children?: React.ReactNode;
}) {
  return (
    <AD.Root open={open} onOpenChange={onOpenChange}>
      <AD.Portal>
        <AD.Overlay className={overlay} />
        <AD.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-surface-raised p-6 shadow-md">
          <AD.Title className="font-display text-xl font-medium">{title}</AD.Title>
          <AD.Description className="mt-2 text-sm text-muted-foreground">{description}</AD.Description>
          {children}
          <div className="mt-6 flex justify-end gap-2">
            <AD.Cancel asChild>
              <Button variant="secondary">Cancel</Button>
            </AD.Cancel>
            <Button variant={tone === "danger" ? "danger" : "primary"} loading={loading} onClick={onConfirm}>
              {confirmLabel}
            </Button>
          </div>
        </AD.Content>
      </AD.Portal>
    </AD.Root>
  );
}
