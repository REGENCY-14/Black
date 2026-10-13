"use client";

import * as Tabs from "@radix-ui/react-tabs";
import { cn } from "@/lib/cn";

export interface SegmentItem {
  value: string;
  label: string;
  count?: number;
}

interface SegmentedControlProps {
  items: SegmentItem[];
  value: string;
  onValueChange: (value: string) => void;
  "aria-label": string;
  className?: string;
  /** Optional panels keyed by item value. With panels it is a real tablist; without, a pressed-button group. */
  panels?: Record<string, React.ReactNode>;
}

const listClass = "no-scrollbar inline-flex max-w-full gap-1 overflow-x-auto rounded-pill bg-subtle p-1";
const itemClass =
  "inline-flex min-h-hit shrink-0 items-center gap-2 rounded-pill px-4 text-sm font-medium whitespace-nowrap text-fg-secondary transition-colors";
const activeClass = "bg-card text-fg shadow-card";

function Label({ it }: { it: SegmentItem }) {
  return (
    <>
      {it.label}
      {it.count !== undefined && <span className="text-xs text-fg-muted">{it.count}</span>}
    </>
  );
}

/** Pill container with a white active segment (reference 2). Scrolls horizontally on narrow screens. */
export function SegmentedControl({
  items,
  value,
  onValueChange,
  className,
  panels,
  ...aria
}: SegmentedControlProps) {
  const root = cn("max-w-full min-w-0", className);

  if (!panels) {
    return (
      <div role="group" {...aria} className={cn(root, listClass)}>
        {items.map((it) => (
          <button
            key={it.value}
            type="button"
            aria-pressed={it.value === value}
            onClick={() => onValueChange(it.value)}
            className={cn(itemClass, it.value === value && activeClass)}
          >
            <Label it={it} />
          </button>
        ))}
      </div>
    );
  }

  return (
    <Tabs.Root value={value} onValueChange={onValueChange} className={root}>
      <Tabs.List {...aria} className={listClass}>
        {items.map((it) => (
          <Tabs.Trigger
            key={it.value}
            value={it.value}
            className={cn(
              itemClass,
              "data-[state=active]:bg-card data-[state=active]:text-fg data-[state=active]:shadow-card",
            )}
          >
            <Label it={it} />
          </Tabs.Trigger>
        ))}
      </Tabs.List>
      {items.map((it) => (
        <Tabs.Content key={it.value} value={it.value} className="mt-4">
          {panels[it.value]}
        </Tabs.Content>
      ))}
    </Tabs.Root>
  );
}
