import { Lock, Truck } from "lucide-react";
import { businessRules } from "@/config";
import { deliveryNote } from "@/config/delivery";
import type { PaymentPlan } from "@/lib/api/types";
import { totalsFor, type CartGroup } from "@/lib/checkout";
import { formatArrivalWindow, formatDate } from "@/lib/dates";
import { formatGHS } from "@/lib/money";

/** Itemised summary in GH₵ with no hidden lines (FR-3.5). Delivery has no fee line (client decision Q12). */
export function OrderSummary({ groups, plan }: { groups: CartGroup[]; plan: PaymentPlan }) {
  const t = totalsFor(groups, plan);
  const split = groups.length > 1;
  return (
    <div className="flex flex-col gap-4" data-testid="order-summary">
      {groups.map((g, i) => (
        <section
          key={g.batch.id}
          aria-label={split ? `Order ${i + 1}` : "Items"}
          className="flex flex-col gap-2"
        >
          {split && (
            <h3 className="text-sm font-semibold">
              Order {i + 1} · arrives {formatArrivalWindow(g.batch.expectedArrival)}
            </h3>
          )}
          <ul className="flex flex-col gap-1.5 text-sm">
            {g.lines.map((l) => (
              <li key={l.key} className="flex justify-between gap-4">
                <span className="min-w-0 text-fg-secondary">
                  {l.quantity} × {l.name}
                  {Object.values(l.variantLabels).length > 0 && (
                    <span className="text-fg-muted"> ({Object.values(l.variantLabels).join(", ")})</span>
                  )}
                </span>
                <span className="shrink-0 tabular-nums">{formatGHS(l.unitPriceMinor * l.quantity)}</span>
              </li>
            ))}
          </ul>
        </section>
      ))}

      <dl className="flex flex-col gap-2 border-t border-line pt-4 text-sm">
        <div className="flex justify-between gap-4">
          <dt>Items total</dt>
          <dd className="tabular-nums">{formatGHS(t.totalMinor)}</dd>
        </div>
        <div className="flex justify-between gap-4 text-fg-muted">
          <dt>Shipping from China and duty</dt>
          <dd>Included</dd>
        </div>
        <div className="flex justify-between gap-4 border-t border-line pt-3 text-base font-semibold">
          <dt>
            {plan === "full" ? "Pay now (in full)" : `Pay now (${businessRules.deposit.percent}% deposit)`}
          </dt>
          <dd className="tabular-nums" data-testid="pay-now">
            {formatGHS(t.dueNowMinor)}
          </dd>
        </div>
        {plan === "deposit" &&
          groups.map((g, i) => (
            <div key={g.batch.id} className="flex justify-between gap-4 text-fg-secondary">
              <dt>
                Balance{split ? ` for order ${i + 1}` : ""} due {formatDate(g.balanceDueDate)}
              </dt>
              <dd className="tabular-nums">{formatGHS(g.balanceMinor)}</dd>
            </div>
          ))}
      </dl>

      <ul className="flex flex-col gap-2 text-sm text-fg-secondary">
        {businessRules.priceLockedOnDeposit && (
          <li className="flex items-start gap-2">
            <Lock className="mt-0.5 size-4 shrink-0" aria-hidden /> Price is locked once your deposit is paid.
          </li>
        )}
        <li className="flex items-start gap-2">
          <Truck className="mt-0.5 size-4 shrink-0" aria-hidden /> {deliveryNote}
        </li>
      </ul>
    </div>
  );
}
