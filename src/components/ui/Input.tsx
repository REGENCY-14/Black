import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

const control =
  "w-full rounded-input border border-line bg-card px-4 text-fg placeholder:text-fg-faint " +
  "transition-colors hover:border-line-active/50 focus-visible:border-line-active focus-visible:outline-2 " +
  "aria-[invalid=true]:border-danger disabled:opacity-50";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className, ...props },
  ref,
) {
  return <input ref={ref} className={cn(control, "h-control-md", className)} {...props} />;
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, rows = 4, ...props }, ref) {
    return <textarea ref={ref} rows={rows} className={cn(control, "min-h-24 py-3", className)} {...props} />;
  },
);

/** Ghana number input. Shows the +233 prefix; accepts 0XXXXXXXXX or +233XXXXXXXXX (normalised in lib/phone). */
export const PhoneInput = forwardRef<HTMLInputElement, Omit<InputHTMLAttributes<HTMLInputElement>, "type">>(
  function PhoneInput({ className, ...props }, ref) {
    return (
      <div className="relative">
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-4 flex items-center border-r border-line pr-3 text-fg-secondary"
        >
          +233
        </span>
        <Input
          ref={ref}
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="24 000 0000"
          className={cn("pl-20", className)}
          {...props}
        />
      </div>
    );
  },
);
