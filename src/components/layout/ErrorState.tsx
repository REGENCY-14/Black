"use client";

import { AlertCircle, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";

/**
 * Friendly fallback for an unexpected error in a route group. Says what happened and what to do,
 * keeps the page chrome around it, and lets the customer retry without losing their cart.
 *
 * Plain markup on purpose: an error boundary is shipped with every page, so it must not pull the
 * shared UI kit (and its class-merging library) into every page's first-load JavaScript.
 */
export function ErrorState({
  error,
  retry,
  homeHref = "/",
  homeLabel = "Go to the home page",
}: {
  error: Error & { digest?: string };
  retry: () => void;
  homeHref?: string;
  homeLabel?: string;
}) {
  useEffect(() => {
    // a real deployment would send this to an error reporting service
    console.error(error);
  }, [error]);

  const button =
    "inline-flex h-control-lg w-full items-center justify-center gap-2 rounded-btn px-6 font-medium transition-transform active:scale-[0.98] sm:w-auto";

  return (
    <div className="container-page flex flex-1 items-center justify-center py-12">
      <div
        role="alert"
        className="flex w-full max-w-lg flex-col items-start gap-4 rounded-card-lg bg-card pad-card text-fg shadow-card"
      >
        <span
          className="inline-flex size-12 items-center justify-center rounded-pill bg-danger-soft"
          aria-hidden
        >
          <AlertCircle className="size-6 text-danger" />
        </span>
        <div>
          <h1 className="text-2xl font-semibold">Something went wrong on our side</h1>
          <p className="mt-1 text-fg-secondary">
            Nothing you entered has been lost. Try again, and if it keeps happening, message us on WhatsApp.
          </p>
          {error.digest && <p className="mt-2 text-sm text-fg-muted">Reference: {error.digest}</p>}
        </div>
        <div className="flex w-full flex-col gap-3 sm:flex-row">
          <button type="button" onClick={() => retry()} className={`${button} bg-primary text-primary-fg`}>
            <RotateCcw className="size-5" aria-hidden /> Try again
          </button>
          <Link href={homeHref} className={`${button} border border-line bg-card text-fg`}>
            {homeLabel}
          </Link>
        </div>
      </div>
    </div>
  );
}
