"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useCart } from "@/stores/cart";

// persist is absent during SSR (no localStorage); subscribe/rehydrate only run on the client.
const subscribe = (onChange: () => void) => useCart.persist.onFinishHydration(onChange);
const getSnapshot = () => useCart.persist?.hasHydrated() ?? false;
const getServerSnapshot = () => false;

/** True after the persisted cart has been read from localStorage. Gate cart-dependent UI on this. */
export function useCartHydrated(): boolean {
  const hydrated = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  useEffect(() => {
    if (!useCart.persist.hasHydrated()) void useCart.persist.rehydrate();
  }, []);
  return hydrated;
}

/** Cart lines, empty until hydrated so SSR and first paint agree. */
export function useCartLines() {
  const hydrated = useCartHydrated();
  const lines = useCart((s) => s.lines);
  return { lines: hydrated ? lines : [], hydrated };
}
