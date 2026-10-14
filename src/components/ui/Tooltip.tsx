"use client";

import * as RTooltip from "@radix-ui/react-tooltip";

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
