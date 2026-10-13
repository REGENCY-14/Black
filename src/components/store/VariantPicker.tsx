"use client";

import { useId } from "react";
import type { VariantGroup } from "@/lib/api/types";
import { cn } from "@/lib/cn";

/** One variant group (size, colour) as a radio group of pill chips. Sold-out options are disabled. */
export function VariantPicker({
  group,
  value,
  onChange,
  error,
}: {
  group: VariantGroup;
  value?: string;
  onChange: (optionId: string) => void;
  error?: string;
}) {
  const errId = useId();
  return (
    <div
      role="radiogroup"
      aria-label={group.name}
      aria-describedby={error ? errId : undefined}
      className="flex flex-col gap-2"
    >
      <p className="text-sm font-medium">
        {group.name}
        {value && (
          <span className="font-normal text-fg-muted">
            : {group.options.find((o) => o.id === value)?.label}
          </span>
        )}
      </p>
      <div className="flex flex-wrap gap-2">
        {group.options.map((o) => {
          const soldOut = o.limit !== undefined && o.ordered >= o.limit;
          const selected = o.id === value;
          return (
            <button
              key={o.id}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={soldOut}
              onClick={() => onChange(o.id)}
              className={cn(
                "min-h-hit min-w-hit rounded-pill border px-4 text-sm font-medium transition-colors",
                selected
                  ? "border-primary bg-primary text-primary-fg"
                  : "border-line bg-card text-fg hover:bg-subtle",
                soldOut && "pointer-events-none text-fg-muted line-through opacity-60",
              )}
            >
              {o.label}
              {soldOut && <span className="sr-only"> (sold out)</span>}
            </button>
          );
        })}
      </div>
      <p id={errId} role="alert" className="text-sm text-danger empty:hidden">
        {error}
      </p>
    </div>
  );
}
