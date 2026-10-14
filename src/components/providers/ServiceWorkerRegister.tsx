"use client";

import { useEffect } from "react";

/** Registers /sw.js in production only (a service worker in development hides code changes). */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
      /* installing is a bonus; the site works fine without it */
    });
  }, []);
  return null;
}
