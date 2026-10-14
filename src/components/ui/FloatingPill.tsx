import { forwardRef, type AnchorHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

/** Black pill action floating over content (reference 2 "Send request"; used for the WhatsApp action). */
export const FloatingPill = forwardRef<HTMLAnchorElement, AnchorHTMLAttributes<HTMLAnchorElement>>(
  function FloatingPill({ className, ...props }, ref) {
    return (
      <a
        ref={ref}
        className={cn(
          "inline-flex min-h-hit items-center gap-2 rounded-btn bg-inverse px-5 text-sm font-medium text-fg-inverse shadow-float md:rounded-pill",
          "transition-transform active:scale-[0.98]",
          className,
        )}
        {...props}
      />
    );
  },
);
