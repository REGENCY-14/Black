import { businessRules } from "@/config";

/** All money is an integer number of pesewas (1 GH₵ = 100 pesewas). Never use floats for totals. */
export type Pesewas = number;

const fmt = new Intl.NumberFormat("en-GH", { style: "currency", currency: businessRules.currency });
const fmtWhole = new Intl.NumberFormat("en-GH", {
  style: "currency",
  currency: businessRules.currency,
  maximumFractionDigits: 0,
});

export function cedisToPesewas(cedis: number): Pesewas {
  return Math.round(cedis * 100);
}

/** "GH₵1,234.50". Whole-cedi amounts drop the ".00" ("GH₵420") unless `fixed` is set. */
export function formatGHS(pesewas: Pesewas, opts: { fixed?: boolean } = {}): string {
  if (!Number.isInteger(pesewas)) throw new Error(`Money must be integer pesewas, got ${pesewas}`);
  return !opts.fixed && pesewas % 100 === 0 ? fmtWhole.format(pesewas / 100) : fmt.format(pesewas / 100);
}

export function sumPesewas(values: Pesewas[]): Pesewas {
  return values.reduce((a, b) => a + b, 0);
}

export function lineTotal(unitPrice: Pesewas, quantity: number): Pesewas {
  return unitPrice * quantity;
}

/** Deposit = round(total * percent / 100). */
export function computeDeposit(total: Pesewas, percent: number = businessRules.deposit.percent): Pesewas {
  return Math.round((total * percent) / 100);
}

export interface PaymentSplit {
  depositMinor: Pesewas;
  balanceMinor: Pesewas;
}

export function splitPayment(total: Pesewas, percent: number = businessRules.deposit.percent): PaymentSplit {
  const depositMinor = computeDeposit(total, percent);
  return { depositMinor, balanceMinor: total - depositMinor };
}
