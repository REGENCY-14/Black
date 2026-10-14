"use client";

import { ServiceWorkerRegister } from "./ServiceWorkerRegister";
import { ThemeProvider } from "./ThemeProvider";

/**
 * Only what every page needs: the theme and the service worker. Data fetching and toasts are provided
 * by the pages that use them (see QueryProvider and AppProviders), so the home page ships less JavaScript.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      {children}
      <ServiceWorkerRegister />
    </ThemeProvider>
  );
}
