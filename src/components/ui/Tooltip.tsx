"use client";

import * as RTooltip from "@radix-ui/react-tooltip";
import { forwardRef, type AnchorHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export function TooltipProvider({ children }: { children: React.ReactNode }) {
  return <RTooltip.Provider delayDuration={200}>{children}</RTooltip.Provider>;
}

/** Black pill tooltip (reference 3). The trigger must be focusable. */
export function Tooltip({ content, children }: { content: string; children: React.ReactElement }) {
  return (
    <RTooltip.Root>
      <RTooltip.Trigger asChild>{children}</RTooltip.Trigger>
      <RTooltip.Portal>
        <RTooltip.Content
          sideOffset={8}
          className="z-50 rounded-btn bg-inverse px-3 py-2 text-sm font-medium text-fg-inverse shadow-float"
        >
          {content}
        </RTooltip.Content>
      </RTooltip.Portal>
    </RTooltip.Root>
  );
}

/** Black pill action floating over content (reference 2 "Send request"; used for the WhatsApp action). */
export const FloatingPill = forwardRef<HTMLAnchorElement, AnchorHTMLAttributes<HTMLAnchorElement>>(
  function FloatingPill({ className, ...props }, ref) {
    return (
      <a
        ref={ref}
        className={cn(
          "inline-flex min-h-hit items-center gap-2 rounded-pill bg-inverse px-5 text-sm font-medium text-fg-inverse shadow-float",
          "transition-transform active:scale-[0.98]",
          className,
        )}
        {...props}
      />
    );
  },
);
