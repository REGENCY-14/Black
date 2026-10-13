"use client";

import { useMemo, useSyncExternalStore } from "react";

/** What the confirmation page needs after payment. Kept in sessionStorage for this tab only. */
export interface LastCheckout {
  /** One entry per order created (carts split by arrival batch). */
  orders: { orderNumber: string }[];
  /** Phone used to verify ownership when looking the orders up again. */
  contact: string;
  /** What the customer chose, for the confirmation copy. */
  plan: "deposit" | "full";
}

const KEY = "last-checkout";
const listeners = new Set<() => void>();

export function saveLastCheckout(value: LastCheckout) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(value));
  } catch {
    /* storage blocked: the confirmation page falls back to a track link */
  }
  listeners.forEach((l) => l());
}

const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};
const read = () => {
  try {
    return sessionStorage.getItem(KEY);
  } catch {
    return null;
  }
};

export function useLastCheckout(): { value: LastCheckout | null; ready: boolean } {
  const raw = useSyncExternalStore(subscribe, read, () => undefined);
  return useMemo(() => {
    if (raw === undefined) return { value: null, ready: false };
    try {
      return { value: raw ? (JSON.parse(raw) as LastCheckout) : null, ready: true };
    } catch {
      return { value: null, ready: true };
    }
  }, [raw]);
}
