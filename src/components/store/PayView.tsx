"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BalancePayment } from "@/components/store/BalancePayment";
import { OrderLookupForm } from "@/components/store/OrderLookupForm";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { useOrder } from "@/hooks/api";
import type { OrderLookup } from "@/lib/api/types";
import { formatArrivalWindow } from "@/lib/dates";
import { readLastTracked, saveLastTracked } from "@/lib/lastTracked";
import { normalizeOrderNumber } from "@/lib/phone";
import { balanceMinor } from "@/lib/status";

/**
 * Complete payment: enter the order number (or arrive from a WhatsApp reminder with ?order=),
 * verify with phone/email, see the balance and due date, then pay with the same flow as checkout.
 */
export function PayView({ initialOrderNumber }: { initialOrderNumber?: string }) {
  const [remembered] = useState(() => readLastTracked());
  const wanted = initialOrderNumber ? normalizeOrderNumber(initialOrderNumber) : undefined;
  const sameOrder = !!remembered && (!wanted || remembered.orderNumber === wanted);
  const [lookup, setLookup] = useState<OrderLookup | null>(null);
  // once paid here, keep the payment card (and its thank-you) on screen instead of the refetched "nothing to pay"
  const [paidHere, setPaidHere] = useState(false);
  const q = useOrder(lookup);

  // Keep the device shortcut (and offline copy) fresh so Track opens this order next time.
  useEffect(() => {
    if (q.data && lookup) {
      saveLastTracked({
        orderNumber: q.data.orderNumber,
        contact: lookup.contact,
        snapshot: q.data,
        savedAt: new Date().toISOString(),
      });
    }
  }, [q.data, lookup]);

  if (lookup && q.isPending) {
    return <Skeleton className="h-72 max-w-xl rounded-card-lg" aria-busy="true" />;
  }

  if (lookup && q.data) {
    const order = q.data;
    const balance = balanceMinor(order);

    const done = (title: string, text: string) => (
      <Card size="lg" className="flex max-w-xl flex-col items-start gap-3" data-testid="pay-nothing">
        <h2 className="text-xl font-semibold">{title}</h2>
        <p className="text-fg-secondary">{text}</p>
        <div className="flex flex-wrap gap-3">
          <Button asChild variant="secondary">
            <Link href={`/track?order=${order.orderNumber}`}>Track this order</Link>
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              setPaidHere(false);
              setLookup(null);
            }}
          >
            Pay a different order
          </Button>
        </div>
      </Card>
    );

    if (!paidHere && order.status === "cancelled") {
      return done(
        "This order was cancelled",
        "There is nothing to pay. You can see the refund status on the tracking page.",
      );
    }
    if (!paidHere && balance === 0) {
      return done("Nothing left to pay", `Order ${order.orderNumber} is fully paid. Thank you.`);
    }
    return (
      <Card size="lg" as="section" aria-labelledby="pay-title" className="flex max-w-xl flex-col gap-5">
        <div>
          <p className="text-sm text-fg-muted">Order</p>
          <h2 id="pay-title" className="text-2xl font-semibold tracking-wide break-all">
            {order.orderNumber}
          </h2>
          <p className="text-sm text-fg-muted">
            {order.items.length} {order.items.length === 1 ? "item" : "items"} · arrives{" "}
            {formatArrivalWindow(order.expectedArrival)}
          </p>
        </div>
        <BalancePayment order={order} lookup={lookup} onPaid={() => setPaidHere(true)} />
      </Card>
    );
  }

  return (
    <Card size="lg" className="max-w-xl">
      <OrderLookupForm
        defaultOrderNumber={wanted ?? remembered?.orderNumber ?? ""}
        defaultContact={sameOrder ? (remembered?.contact ?? "") : ""}
        submitLabel="Find my balance"
        loading={q.isFetching}
        error={lookup && q.isError ? q.error.message : undefined}
        onSubmit={(l) => {
          if (lookup && lookup.orderNumber === l.orderNumber && lookup.contact === l.contact)
            void q.refetch();
          else setLookup(l);
        }}
      />
    </Card>
  );
}
