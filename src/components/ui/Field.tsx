import { cloneElement, useId, type ReactElement } from "react";
import { cn } from "@/lib/cn";

interface FieldProps {
  label: string;
  hint?: string;
  error?: string;
  optional?: boolean;
  className?: string;
  children: ReactElement<{ id?: string; "aria-describedby"?: string; "aria-invalid"?: boolean }>;
}

/** Label + control + hint + error. Wires ids and aria attributes; errors are announced. */
export function Field({ label, hint, error, optional, className, children }: FieldProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errId = `${id}-err`;
  const describedBy = [hint && hintId, error && errId].filter(Boolean).join(" ") || undefined;
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-sm font-medium text-fg">
        {label}
        {optional && <span className="font-normal text-fg-muted"> (optional)</span>}
      </label>
      {cloneElement(children, {
        id,
        "aria-describedby": describedBy,
        "aria-invalid": error ? true : undefined,
      })}
      {hint && !error && (
        <p id={hintId} className="text-sm text-fg-muted">
          {hint}
        </p>
      )}
      <p id={errId} aria-live="polite" className="text-sm text-danger empty:hidden">
        {error}
      </p>
    </div>
  );
}
