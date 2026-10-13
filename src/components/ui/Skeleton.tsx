import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

/** Loading placeholder. Give it the final dimensions so nothing shifts when content arrives. */
export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div aria-hidden className={cn("animate-pulse rounded-btn bg-subtle", className)} {...props} />;
}
