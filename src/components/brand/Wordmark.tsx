import { brand } from "@/config";
import clsx from "clsx";

/** The cube mark on its own. One colour (currentColor), so it works on light, dark and teal surfaces. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={className ?? "size-7"} fill="currentColor">
      <rect width="32" height="32" rx="9" />
      <polygon points="16,6.5 24,11 16,15.5 8,11" fill="var(--bg-page)" />
      <polygon points="8,11 16,15.5 16,25.5 8,21" fill="var(--bg-page)" fillOpacity="0.7" />
      <polygon points="24,11 16,15.5 16,25.5 24,21" fill="var(--bg-page)" fillOpacity="0.45" />
    </svg>
  );
}

/**
 * Mark plus the store name from config/brand.ts. The mark does not depend on the name,
 * so confirming the final name never means redrawing the logo.
 */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={clsx("inline-flex items-center gap-2 font-semibold tracking-tight", className)}>
      <LogoMark />
      <span className="text-lg">{brand.name}</span>
    </span>
  );
}
