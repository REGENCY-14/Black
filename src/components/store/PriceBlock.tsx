import { businessRules } from "@/config";
import { cn } from "@/lib/cn";
import { formatGHS } from "@/lib/money";

export function PriceBlock({
  priceMinor,
  size = "md",
  showIncludes = false,
  className,
}: {
  priceMinor: number;
  size?: "md" | "lg";
  /** Shows "Price includes shipping from China and duty" (Q1-A). */
  showIncludes?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-0.5", className)}>
      <p className={cn("font-semibold tabular-nums", size === "lg" ? "text-2xl" : "text-base")}>
        {formatGHS(priceMinor)}
      </p>
      {showIncludes && businessRules.priceIncludesShippingAndDuty && (
        <p className="text-sm text-fg-muted">Price includes shipping from China and duty.</p>
      )}
    </div>
  );
}
