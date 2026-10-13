import type { Batch, PaymentPlan } from "@/lib/api/types";
import { balanceDueDate, isBalanceDuePassed } from "@/lib/dates";
import { computeDeposit, sumPesewas } from "@/lib/money";
import type { CartLine } from "@/stores/cart";

/**
 * Items that arrive at different times become separate orders (Q10-A), so the cart is grouped
 * by batch. Each group is one future order with its own deposit, balance and due date.
 */
export interface CartGroup {
  batch: Batch;
  lines: CartLine[];
  subtotalMinor: number;
  depositMinor: number;
  balanceMinor: number;
  balanceDueDate: string;
  /** False once the balance due date has passed: only full payment is possible. */
  depositAllowed: boolean;
}

export function groupCart(lines: CartLine[], batches: Batch[], now?: Date): CartGroup[] {
  const groups = new Map<string, CartLine[]>();
  for (const l of lines) groups.set(l.batchId, [...(groups.get(l.batchId) ?? []), l]);

  return [...groups.entries()]
    .flatMap(([batchId, groupLines]) => {
      const batch = batches.find((b) => b.id === batchId);
      if (!batch) return [];
      const subtotalMinor = sumPesewas(groupLines.map((l) => l.unitPriceMinor * l.quantity));
      const depositMinor = computeDeposit(subtotalMinor);
      return [
        {
          batch,
          lines: groupLines,
          subtotalMinor,
          depositMinor,
          balanceMinor: subtotalMinor - depositMinor,
          balanceDueDate: balanceDueDate(batch.expectedArrival),
          depositAllowed: !isBalanceDuePassed(batch.expectedArrival, now ?? new Date()),
        },
      ];
    })
    .sort((a, b) => a.batch.expectedArrival.localeCompare(b.batch.expectedArrival));
}

export const canPayDeposit = (groups: CartGroup[]) => groups.every((g) => g.depositAllowed);

export interface CheckoutTotals {
  totalMinor: number;
  /** Amount charged now for the chosen plan (sum of per-order deposits, or the full total). */
  dueNowMinor: number;
  balanceMinor: number;
}

export function totalsFor(groups: CartGroup[], plan: PaymentPlan): CheckoutTotals {
  const totalMinor = sumPesewas(groups.map((g) => g.subtotalMinor));
  const dueNowMinor = plan === "full" ? totalMinor : sumPesewas(groups.map((g) => g.depositMinor));
  return { totalMinor, dueNowMinor, balanceMinor: totalMinor - dueNowMinor };
}
