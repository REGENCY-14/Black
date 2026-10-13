import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/cn";

interface RadioCardProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "children"> {
  label: ReactNode;
  description?: ReactNode;
  /** Right-aligned value, for example an amount. */
  trailing?: ReactNode;
}

/** Selectable card built on a real radio input (keyboard, screen reader and RHF friendly). */
export const RadioCard = forwardRef<HTMLInputElement, RadioCardProps>(function RadioCard(
  { label, description, trailing, className, ...props },
  ref,
) {
  return (
    <label
      className={cn(
        "relative block cursor-pointer",
        props.disabled && "cursor-not-allowed opacity-60",
        className,
      )}
    >
      <input ref={ref} type="radio" className="peer sr-only" {...props} />
      <span
        className={cn(
          "flex min-h-14 items-start gap-3 rounded-card border border-line bg-card p-4 transition-colors",
          "peer-checked:border-line-active peer-checked:bg-accent-soft peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-focus peer-checked:[&_[data-dot]]:block",
        )}
      >
        <span
          aria-hidden
          className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-pill border border-line bg-card"
        >
          <span data-dot className="hidden size-2.5 rounded-pill bg-accent" />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="font-medium">{label}</span>
          {description && <span className="text-sm text-fg-secondary">{description}</span>}
        </span>
        {trailing && <span className="shrink-0 font-semibold tabular-nums">{trailing}</span>}
      </span>
    </label>
  );
});
