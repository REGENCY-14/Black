"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

/**
 * Data fetching is only needed on pages that load data in the browser (shop, cart, checkout, track,
 * pay, admin). Keeping it out of the global providers keeps it out of the home page's JavaScript.
 * In the browser every page shares one client so the cache survives moving between pages.
 */
let browserClient: QueryClient | undefined;

function makeClient() {
  return new QueryClient({
    defaultOptions: {
      // 'always': do not pause while offline; the API layer throws a clear network error instead
      queries: { refetchOnWindowFocus: false, retry: 1, networkMode: "always" },
      mutations: { networkMode: "always" },
    },
  });
}

function getClient() {
  if (typeof window === "undefined") return makeClient();
  return (browserClient ??= makeClient());
}

export function QueryProvider({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={getClient()}>{children}</QueryClientProvider>;
}
