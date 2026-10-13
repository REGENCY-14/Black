"use client";

import { Ban, MessageCircle, Package, WifiOff } from "lucide-react";
import { useState } from "react";
import { BalancePayment } from "@/components/store/BalancePayment";
import { DelayedBanner, OrderTimeline } from "@/components/store/OrderTimeline";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Sheet } from "@/components/ui/Sheet";
import { businessRules, whatsappLink } from "@/config";
import { deliveryNote } from "@/config/delivery";
import { useRequestCancellation } from "@/hooks/api";
import type { Order, OrderLookup } from "@/lib/api/types";
import { daysBetween, formatArrivalWindow, formatDate, formatDateTime, relativeDays } from "@/lib/dates";
import { formatGHS } from "@/lib/money";
import {
  balanceMinor,
  canRequestCancellation,
  hasBalanceDue,
  isAwaitingPayment,
  statusMeta,
} from "@/lib/status";

const methodLabel: Record<Order["payments"][number]["method"], string> = {
  mtn_momo: "MTN MoMo",
  telecel_cash: "Telecel Cash",
  airteltigo_money: "AirtelTigo Money",
  card: "Card",
  cash: "Cash",
  bank_transfer: "Bank transfer",
};

function CancelledSummary({ order }: { order: Order }) {
  const entry = [...order.history].reverse().find((h) => h.status === "cancelled");
  const refund = order.refund;
  return (
    <Card
      as="section"
      aria-labelledby="cancelled-title"
      className="flex flex-col gap-3"
      data-testid="cancelled-summary"
    >
      <div className="flex items-center gap-3">
        <span className="inline-flex size-10 items-center justify-center rounded-pill bg-subtle" aria-hidden>
          <Ban className="size-5 text-fg-secondary" />
        </span>
        <h2 id="cancelled-title" className="text-lg font-semibold">
          This order was cancelled
        </h2>
      </div>
      {entry && <p className="text-sm text-fg-muted">{formatDateTime(entry.at)}</p>}
      {entry?.note && <p className="text-fg-secondary">{entry.note}</p>}
      <p className="rounded-card bg-subtle p-4 text-sm" data-testid="refund-status">
        {refund?.status === "refunded" && (
          <>
            <strong className="font-semibold">Refunded.</strong> {formatGHS(refund.amountMinor)} went back to
            your original payment method.
          </>
        )}
        {refund?.status === "pending" && (
          <>
            <strong className="font-semibold">Refund on its way.</strong> {formatGHS(refund.amountMinor)} is
            being returned to your original payment method. We will message you on WhatsApp when it is done.
          </>
        )}
        {(!refund || refund.status === "none") && <>You were not charged for this order.</>}
      </p>
    </Card>
  );
}

export function OrderResult({
  order,
  lookup,
  offlineSavedAt,
}: {
  order: Order;
  lookup: OrderLookup;
  /** Set when showing a saved copy because the network is down. */
  offlineSavedAt?: string;
}) {
  const meta = statusMeta[order.status];
  const [paySheet, setPaySheet] = useState(false);
  const [cancelSheet, setCancelSheet] = useState(false);
  const cancel = useRequestCancellation();

  const cancelled = order.status === "cancelled";
  const balance = balanceMinor(order);
  const awaiting = !cancelled && isAwaitingPayment(order);
  const dueNow = !cancelled && (awaiting || hasBalanceDue(order));
  const overdue = dueNow && daysBetween(new Date(), order.balanceDueDate) < 0;
  const expected =
    order.status === "delayed" && order.delayedUntil ? order.delayedUntil : order.expectedArrival;

  return (
    <div className="flex flex-col gap-4" data-testid="order-result">
      {offlineSavedAt && (
        <p role="status" className="flex items-start gap-3 rounded-card bg-warning-soft p-4 text-sm">
          <WifiOff className="mt-0.5 size-5 shrink-0 text-warning" aria-hidden />
          <span>
            <strong className="font-semibold">You are offline.</strong> This is the last status we saved on{" "}
            {formatDateTime(offlineSavedAt)}. It may have changed.
          </span>
        </p>
      )}

      <Card size="lg" as="section" aria-labelledby="order-title" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm text-fg-muted">Order</p>
            <h2
              id="order-title"
              className="text-2xl font-semibold tracking-wide break-all"
              data-testid="tracked-order-number"
            >
              {order.orderNumber}
            </h2>
          </div>
          <Badge tone={meta.tone} icon={<meta.icon />} data-testid="status-badge">
            {meta.label}
          </Badge>
        </div>
        <p className="text-fg-secondary">{meta.meaning}</p>
        {!cancelled && order.status !== "delivered" && (
          <p className="flex items-center gap-2 text-sm text-fg-muted">
            <Package className="size-4" aria-hidden />
            Expected in Ghana{" "}
            {order.status === "delayed" ? `around ${formatDate(expected)}` : formatArrivalWindow(expected)}
          </p>
        )}
      </Card>

      {order.status === "delayed" && <DelayedBanner order={order} />}

      {dueNow && (
        <Card
          as="section"
          aria-labelledby="balance-title"
          className="flex flex-col gap-3 border border-line-active bg-accent-soft"
          data-testid="balance-banner"
        >
          <div>
            <h2 id="balance-title" className="text-lg font-semibold">
              {awaiting
                ? "We have not received your payment"
                : `Balance ${formatGHS(balance)} due ${formatDate(order.balanceDueDate)}`}
            </h2>
            <p className="text-sm text-fg-secondary">
              {awaiting
                ? `Pay ${formatGHS(balance)} to confirm your order.`
                : overdue
                  ? `This was due ${relativeDays(order.balanceDueDate)}. Pay now to keep your order. Orders with an unpaid balance are cancelled ${businessRules.balance.unpaidCancelAfterDays} days after the due date.`
                  : `That is ${relativeDays(order.balanceDueDate)}. It is due ${businessRules.balance.dueDaysBeforeArrival} days before your container arrives.`}
            </p>
          </div>
          <Button
            variant="accent"
            size="lg"
            block="responsive"
            className="self-start"
            onClick={() => setPaySheet(true)}
          >
            {awaiting ? "Complete payment" : "Pay balance"}
          </Button>
        </Card>
      )}

      {cancelled ? (
        <CancelledSummary order={order} />
      ) : (
        <Card as="section" aria-labelledby="progress-title">
          <h2 id="progress-title" className="mb-5 text-lg font-semibold">
            Order progress
          </h2>
          <OrderTimeline order={order} />
        </Card>
      )}

      <Card as="section" aria-labelledby="details-title" className="flex flex-col gap-4">
        <h2 id="details-title" className="text-lg font-semibold">
          Your order
        </h2>
        <ul className="flex flex-col gap-1.5 text-sm">
          {order.items.map((it) => (
            <li key={it.productId + JSON.stringify(it.variants)} className="flex justify-between gap-4">
              <span className="text-fg-secondary">
                {it.quantity} × {it.name}
                {Object.values(it.variants).length > 0 && ` (${Object.values(it.variants).join(", ")})`}
              </span>
              <span className="shrink-0 tabular-nums">{formatGHS(it.unitPriceMinor * it.quantity)}</span>
            </li>
          ))}
        </ul>
        <dl className="flex flex-col gap-1.5 border-t border-line pt-3 text-sm">
          <div className="flex justify-between gap-4">
            <dt>Total</dt>
            <dd className="tabular-nums">{formatGHS(order.totalMinor)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt>Paid</dt>
            <dd className="tabular-nums" data-testid="paid-amount">
              {formatGHS(order.paidMinor)}
            </dd>
          </div>
          {!cancelled && (
            <div className="flex justify-between gap-4 font-semibold">
              <dt>Balance</dt>
              <dd className="tabular-nums">{balance > 0 ? formatGHS(balance) : "Nothing left to pay"}</dd>
            </div>
          )}
        </dl>
        {order.payments.length > 0 && (
          <ul className="flex flex-col gap-1 border-t border-line pt-3 text-sm text-fg-muted">
            {order.payments.map((p) => (
              <li key={p.id} className="flex justify-between gap-4">
                <span>
                  {formatDateTime(p.createdAt)} · {methodLabel[p.method]}
                </span>
                <span className="tabular-nums">{formatGHS(p.amountMinor)}</span>
              </li>
            ))}
          </ul>
        )}
        <p className="text-sm text-fg-muted">{deliveryNote}</p>
      </Card>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button asChild variant="secondary" block="responsive">
          <a
            href={whatsappLink(`Hi, I have a question about order ${order.orderNumber}.`)}
            target="_blank"
            rel="noopener noreferrer"
          >
            <MessageCircle className="size-5" aria-hidden /> Ask about this order
          </a>
        </Button>
        {!cancelled && canRequestCancellation(order) && (
          <Button variant="ghost" block="responsive" onClick={() => setCancelSheet(true)}>
            Request cancellation
          </Button>
        )}
      </div>

      <Sheet
        open={paySheet}
        onOpenChange={setPaySheet}
        title={awaiting ? "Complete your payment" : "Pay your balance"}
        description={`Order ${order.orderNumber}`}
      >
        <BalancePayment order={order} lookup={lookup} onPaid={() => undefined} />
      </Sheet>

      <Sheet
        open={cancelSheet}
        onOpenChange={setCancelSheet}
        title="Cancel this order?"
        description="You can cancel because your goods have not shipped from China yet."
        footer={
          <div className="flex flex-col gap-3 sm:flex-row-reverse">
            <Button
              variant="destructive"
              size="lg"
              block="responsive"
              loading={cancel.isPending}
              onClick={() => cancel.mutate(lookup, { onSuccess: () => setCancelSheet(false) })}
            >
              Yes, cancel order
            </Button>
            <Button variant="secondary" size="lg" block="responsive" onClick={() => setCancelSheet(false)}>
              Keep my order
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-3 text-fg-secondary">
          {order.paidMinor > 0 ? (
            <p>
              You will get a <strong className="text-fg">full refund of {formatGHS(order.paidMinor)}</strong>{" "}
              to your original payment method.
            </p>
          ) : (
            <p>You have not paid anything on this order, so there is nothing to refund.</p>
          )}
          <p>After goods ship from China, an order can no longer be cancelled.</p>
          {cancel.isError && (
            <p role="alert" className="rounded-card bg-danger-soft p-3 text-sm text-danger">
              {cancel.error.message}
            </p>
          )}
        </div>
      </Sheet>
    </div>
  );
}
