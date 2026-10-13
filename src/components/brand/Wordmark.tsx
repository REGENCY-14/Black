import { brand } from "@/config";
import { cn } from "@/lib/cn";

/** One-colour placeholder wordmark (uses currentColor). Swap the SVG when the logo is approved. */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2 font-semibold tracking-tight", className)}>
      <svg viewBox="0 0 32 32" aria-hidden="true" className="size-7" fill="currentColor">
        <rect width="32" height="32" rx="9" />
        <path
          d="M9 21.5V10.5h6.2c2.2 0 3.6 1.1 3.6 3 0 1.2-.6 2.1-1.6 2.6 1.4.4 2.3 1.5 2.3 3 0 2-1.5 3.4-4 3.4H9Zm3-6.6h2.8c.9 0 1.4-.4 1.4-1.1s-.5-1.1-1.4-1.1H12v2.2Zm0 4.3h3.2c1 0 1.5-.4 1.5-1.2 0-.8-.5-1.2-1.5-1.2H12v2.4Z"
          fill="var(--bg-page)"
        />
      </svg>
      <span className="text-lg">{brand.name}</span>
    </span>
  );
}
