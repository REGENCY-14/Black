"use client";

import { AlertCircle, Inbox, Lock } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/cn";

export function PageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-end justify-between gap-3", className)}>
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold md:text-3xl">{title}</h1>
        {description && <p className="mt-1 text-fg-secondary">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-3" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-20 rounded-card" />
      ))}
    </div>
  );
}

export function ErrorPanel({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-start gap-3 rounded-card bg-danger-soft p-5">
      <p className="flex items-center gap-2 font-medium text-danger">
        <AlertCircle className="size-5" aria-hidden /> {message}
      </p>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

export function EmptyPanel({
  title,
  text,
  action,
}: {
  title: string;
  text?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-card bg-card p-6 shadow-card">
      <span className="inline-flex size-11 items-center justify-center rounded-pill bg-subtle" aria-hidden>
        <Inbox className="size-5 text-fg-secondary" />
      </span>
      <div>
        <p className="text-lg font-semibold">{title}</p>
        {text && <p className="text-fg-secondary">{text}</p>}
      </div>
      {action}
    </div>
  );
}

/** Shown instead of an owner-only screen. It renders no data and fetches none. */
export function NoAccess() {
  return (
    <div
      className="flex max-w-xl flex-col items-start gap-4 rounded-card-lg bg-card p-6 shadow-card"
      data-testid="no-access"
    >
      <span className="inline-flex size-12 items-center justify-center rounded-pill bg-subtle" aria-hidden>
        <Lock className="size-6 text-fg-secondary" />
      </span>
      <div>
        <h1 className="text-xl font-semibold">You do not have access to this page</h1>
        <p className="text-fg-secondary">
          This area is for the store owner. Orders and batches are in the menu.
        </p>
      </div>
      <Button asChild variant="secondary">
        <Link href="/admin">Back to dashboard</Link>
      </Button>
    </div>
  );
}
