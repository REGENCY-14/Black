"use client";

import { useEffect, useState } from "react";
import { useCart } from "@/stores/cart";

/** True after the persisted cart has been read from localStorage. Gate cart-dependent UI on this. */
export function useCartHydrated(): boolean {
  const [hydrated, setHydrated] = useState(() => useCart.persist?.hasHydrated() ?? false);
  useEffect(() => {
    // persist is absent during SSR (no localStorage); effects only run on the client.
    const unsub = useCart.persist.onFinishHydration(() => setHydrated(true));
    void useCart.persist.rehydrate();
    return unsub;
  }, []);
  return hydrated;
}

/** Cart lines, empty until hydrated so SSR and first paint agree. */
export function useCartLines() {
  const hydrated = useCartHydrated();
  const lines = useCart((s) => s.lines);
  return { lines: hydrated ? lines : [], hydrated };
}
