"use client";

import { QueryProvider } from "./QueryProvider";
import { ToastProvider } from "@/components/ui/Toast";

/** Data fetching plus toasts, for screens that need both (admin, order confirmation, design page). */
export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      <ToastProvider>{children}</ToastProvider>
    </QueryProvider>
  );
}
