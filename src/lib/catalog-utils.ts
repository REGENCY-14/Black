import type { Product } from "@/lib/api/types";

/** Spots left for the whole product (preorder limit minus units ordered). */
export function productSpotsLeft(p: Pick<Product, "limit" | "ordered">): number {
  return Math.max(0, p.limit - p.ordered);
}

/**
 * Spots left for a chosen combination. Variant-level limits (Q13-A) can be tighter than the product limit.
 * `selection` maps groupId -> optionId.
 */
export function spotsLeft(p: Product, selection: Record<string, string> = {}): number {
  let left = productSpotsLeft(p);
  for (const group of p.variantGroups) {
    const opt = group.options.find((o) => o.id === selection[group.id]);
    if (opt?.limit !== undefined) left = Math.min(left, Math.max(0, opt.limit - opt.ordered));
  }
  return left;
}

export const isSoldOut = (p: Product) => productSpotsLeft(p) === 0;

/** Show the urgency badge only when spots are genuinely few. */
export const LOW_SPOTS_THRESHOLD = 15;
export const isLowStock = (p: Product) => {
  const n = productSpotsLeft(p);
  return n > 0 && n <= LOW_SPOTS_THRESHOLD;
};

export function variantLabels(p: Product, selection: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const g of p.variantGroups) {
    const o = g.options.find((x) => x.id === selection[g.id]);
    if (o) out[g.name] = o.label;
  }
  return out;
}

export function missingVariantGroups(p: Product, selection: Record<string, string>): string[] {
  return p.variantGroups.filter((g) => !selection[g.id]).map((g) => g.name);
}
