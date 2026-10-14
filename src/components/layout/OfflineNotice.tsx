"use client";

import { WifiOff } from "lucide-react";
import { useOnline } from "@/hooks/useOnline";

/** Shown at the top of every storefront page while the device has no connection. */
export function OfflineNotice() {
  const online = useOnline();
  if (online) return null;
  return (
    <div role="status" className="border-b border-line bg-warning-soft" data-testid="offline-notice">
      <p className="container-page flex items-center gap-2 py-3 text-sm">
        <WifiOff className="size-4 shrink-0 text-warning" aria-hidden />
        <span>
          <strong className="font-semibold">No internet connection.</strong> Pages you have already opened
          still work. Orders and payments need a connection.
        </span>
      </p>
    </div>
  );
}
