"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export interface CartLine {
  /** productId + chosen options; the same product in a different size is a different line. */
  key: string;
  productId: string;
  slug: string;
  name: string;
  imageSrc: string;
  unitPriceMinor: number;
  batchId: string;
  /** groupId -> optionId (sent to the API) */
  variants: Record<string, string>;
  /** Display labels, for example { Size: "M" } */
  variantLabels: Record<string, string>;
  quantity: number;
}

export const MAX_LINE_QUANTITY = 20;

export function cartLineKey(productId: string, variants: Record<string, string>): string {
  const opts = Object.entries(variants)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([g, o]) => `${g}:${o}`)
    .join("|");
  return opts ? `${productId}|${opts}` : productId;
}

interface CartState {
  lines: CartLine[];
  add: (line: Omit<CartLine, "key" | "quantity">, quantity?: number) => void;
  setQuantity: (key: string, quantity: number) => void;
  remove: (key: string) => void;
  clear: () => void;
}

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      lines: [],
      add: (line, quantity = 1) =>
        set((s) => {
          const key = cartLineKey(line.productId, line.variants);
          const existing = s.lines.find((l) => l.key === key);
          if (existing) {
            return {
              lines: s.lines.map((l) =>
                l.key === key ? { ...l, quantity: Math.min(MAX_LINE_QUANTITY, l.quantity + quantity) } : l,
              ),
            };
          }
          return { lines: [...s.lines, { ...line, key, quantity: Math.min(MAX_LINE_QUANTITY, quantity) }] };
        }),
      setQuantity: (key, quantity) =>
        set((s) => ({
          lines: s.lines
            .map((l) => (l.key === key ? { ...l, quantity: Math.min(MAX_LINE_QUANTITY, quantity) } : l))
            .filter((l) => l.quantity > 0),
        })),
      remove: (key) => set((s) => ({ lines: s.lines.filter((l) => l.key !== key) })),
      clear: () => set({ lines: [] }),
    }),
    {
      name: "cart",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ lines: s.lines }),
      // Anything unreadable from an older version is dropped rather than crashing the cart.
      migrate: () => ({ lines: [] }) as unknown as CartState,
      // Hydrate after mount (see useHydrated) so server and first client render match.
      skipHydration: true,
    },
  ),
);

export const cartCount = (lines: CartLine[]) => lines.reduce((n, l) => n + l.quantity, 0);
export const cartSubtotal = (lines: CartLine[]) =>
  lines.reduce((n, l) => n + l.unitPriceMinor * l.quantity, 0);
