import type { Order } from "@/lib/api/types";

/**
 * Convenience for returning customers: remember the last order they looked up (plus a snapshot so
 * the last known status can be shown offline). Stored in localStorage on this device only.
 */
export interface LastTracked {
  orderNumber: string;
  /** Phone or email used to verify ownership. */
  contact: string;
  snapshot?: Order;
  savedAt?: string;
}

const KEY = "last-tracked-v1";

export function readLastTracked(): LastTracked | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as LastTracked) : null;
  } catch {
    return null;
  }
}

export function saveLastTracked(value: LastTracked) {
  try {
    localStorage.setItem(KEY, JSON.stringify(value));
  } catch {
    /* storage blocked or full: tracking still works, just without the shortcut */
  }
}

export function forgetLastTracked() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
