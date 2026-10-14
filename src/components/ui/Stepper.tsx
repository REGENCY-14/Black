"use client";

import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/cn";

interface StepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  label?: string;
  className?: string;
}

/** Pill quantity stepper. Both buttons are 44x44 hit targets. */
export function Stepper({ value, onChange, min = 1, max = 99, label = "Quantity", className }: StepperProps) {
  const btn =
    "inline-flex size-hit items-center justify-center rounded-pill text-fg transition-colors hover:bg-subtle active:scale-95 disabled:opacity-40 disabled:pointer-events-none";
  return (
    <div
      role="group"
      aria-label={label}
      className={cn(
        "inline-flex items-center rounded-btn border border-line bg-card p-0.5 md:rounded-pill",
        className,
      )}
    >
      <button
        type="button"
        className={btn}
        aria-label={`Decrease ${label.toLowerCase()}`}
        disabled={value <= min}
        onClick={() => onChange(Math.max(min, value - 1))}
      >
        <Minus className="size-4" aria-hidden />
      </button>
      <output aria-live="polite" className="min-w-10 text-center font-medium tabular-nums">
        {value}
      </output>
      <button
        type="button"
        className={btn}
        aria-label={`Increase ${label.toLowerCase()}`}
        disabled={value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
      >
        <Plus className="size-4" aria-hidden />
      </button>
    </div>
  );
}
