"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";

interface SheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

/** Bottom sheet on mobile, centred dialog from md up. Traps focus, closes on Escape. */
export function Sheet({ open, onOpenChange, title, description, children, footer, className }: SheetProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-inverse/50 data-[state=open]:animate-[fade-in_150ms_ease-out]" />
        <Dialog.Content
          className={cn(
            "fixed z-50 flex max-h-[90dvh] flex-col bg-card text-fg shadow-float outline-none",
            "rounded-t-card-lg inset-x-0 bottom-0 data-[state=open]:animate-[sheet-up_220ms_ease-out]",
            "md:inset-x-auto md:top-1/2 md:bottom-auto md:left-1/2 md:w-full md:max-w-lg md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-card-lg",
            className,
          )}
        >
          <div className="flex items-start justify-between gap-4 px-(--card-pad) pt-(--card-pad)">
            <div className="flex flex-col gap-1">
              <Dialog.Title className="text-lg font-semibold">{title}</Dialog.Title>
              {description ? (
                <Dialog.Description className="text-sm text-fg-muted">{description}</Dialog.Description>
              ) : (
                <Dialog.Description className="sr-only">{title}</Dialog.Description>
              )}
            </div>
            <Dialog.Close
              aria-label="Close"
              className="-mt-1 -mr-2 inline-flex size-hit shrink-0 items-center justify-center rounded-pill hover:bg-subtle"
            >
              <X className="size-5" aria-hidden />
            </Dialog.Close>
          </div>
          <div className="overflow-y-auto px-(--card-pad) py-4">{children}</div>
          {footer && (
            <div className="border-t border-line px-(--card-pad) pt-4 pb-[max(var(--card-pad),env(safe-area-inset-bottom))]">
              {footer}
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
