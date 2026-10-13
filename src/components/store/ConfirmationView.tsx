"use client";

import { ArrowRight, CheckCircle2, Copy, MessageCircle } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import { Button, IconButton } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { businessRules } from "@/config";
import { useOrder } from "@/hooks/api";
import type { Order } from "@/lib/api/types";
import { formatArrivalWindow, formatDate } from "@/lib/dates";
import { useLastCheckout } from "@/lib/lastCheckout";
import { saveLastTracked } from "@/lib/lastTracked";
import { formatGHS } from "@/lib/money";
import { formatGhPhone } from "@/lib/phone";
import { balanceMinor, hasBalanceDue } from "@/lib/status";

function OrderConfirmation({ order, index, count }: { order: Order; index: number; count: number }) {
  const { toast } = useToast();
  const balance = balanceMinor(order);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(order.orderNumber);
      toast({ title: "Order number copied", tone: "success" });
    } catch {
      toast({
        title: "Could not copy",
        description: "Press and hold the number to copy it.",
        tone: "danger",
      });
    }
  };
  const shareText = `My preorder number is ${order.orderNumber}. Track it here: ${typeof window === "undefined" ? "" : window.location.origin}/track?order=${order.orderNumber}`;

  return (
    <Card
      size="lg"
      as="section"
      aria-label={count > 1 ? `Order ${index + 1}` : "Your order"}
      className="flex flex-col gap-5"
    >
      <div className="flex flex-col gap-1">
        <p className="text-sm text-fg-muted">
          {count > 1 ? `Order ${index + 1} of ${count} · ` : ""}Arrives{" "}
          {formatArrivalWindow(order.expectedArrival)}
        </p>
        <div className="flex items-center justify-between gap-3">
          <p className="text-3xl font-semibold tracking-wide break-all" data-testid="order-number">
            {order.orderNumber}
          </p>
          <IconButton
            aria-label={`Copy order number ${order.orderNumber}`}
            icon={<Copy className="size-5" aria-hidden />}
            onClick={copy}
          />
        </div>
      </div>

      <ul className="flex flex-col gap-1.5 text-sm">
        {order.items.map((it) => (
          <li key={it.productId + JSON.stringify(it.variants)} className="flex justify-between gap-4">
            <span className="text-fg-secondary">
              {it.quantity} × {it.name}
              {Object.values(it.variants).length > 0 && ` (${Object.values(it.variants).join(", ")})`}
            </span>
            <span className="tabular-nums">{formatGHS(it.unitPriceMinor * it.quantity)}</span>
          </li>
        ))}
      </ul>

      <dl className="flex flex-col gap-2 border-t border-line pt-4 text-sm">
        <div className="flex justify-between gap-4">
          <dt>Order total</dt>
          <dd className="tabular-nums">{formatGHS(order.totalMinor)}</dd>
        </div>
        <div className="flex justify-between gap-4 font-semibold">
          <dt>Paid</dt>
          <dd className="tabular-nums" data-testid="amount-paid">
            {formatGHS(order.paidMinor)}
          </dd>
        </div>
        {hasBalanceDue(order) ? (
          <div className="flex justify-between gap-4" data-testid="balance-due">
            <dt>Balance due {formatDate(order.balanceDueDate)}</dt>
            <dd className="font-semibold tabular-nums">{formatGHS(balance)}</dd>
          </div>
        ) : (
          <div className="flex justify-between gap-4 text-success">
            <dt>Balance</dt>
            <dd className="font-semibold">Nothing left to pay</dd>
          </div>
        )}
      </dl>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button asChild variant="secondary" block="responsive">
          <Link href={`/track?order=${order.orderNumber}`}>
            Track this order <ArrowRight className="size-4" aria-hidden />
          </Link>
        </Button>
        <Button asChild variant="whatsapp" block="responsive">
          <a
            href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <MessageCircle className="size-5" aria-hidden /> Share on WhatsApp
          </a>
        </Button>
        {hasBalanceDue(order) && (
          <Button asChild variant="accent" block="responsive">
            <Link href={`/pay?order=${order.orderNumber}`}>Pay balance</Link>
          </Button>
        )}
      </div>
    </Card>
  );
}

function LoadedOrder({
  orderNumber,
  contact,
  index,
  count,
}: {
  orderNumber: string;
  contact: string;
  index: number;
  count: number;
}) {
  const q = useOrder({ orderNumber, contact });
  // "Track this order" then opens straight away on this device.
  useEffect(() => {
    if (q.data) {
      saveLastTracked({ orderNumber, contact, snapshot: q.data, savedAt: new Date().toISOString() });
    }
  }, [q.data, orderNumber, contact]);
  if (q.isPending) return <Skeleton className="h-72 rounded-card-lg" />;
  if (q.isError) {
    return (
      <Card role="alert" className="text-sm">
        We could not load {orderNumber} just now. It is safe: track it any time with your order number and
        phone.
      </Card>
    );
  }
  return <OrderConfirmation order={q.data} index={index} count={count} />;
}

export function ConfirmationView() {
  const { value, ready } = useLastCheckout();

  if (!ready) return <Skeleton className="h-72 rounded-card-lg" />;
  if (!value) {
    return (
      <Card className="flex flex-col items-start gap-4 p-6">
        <h2 className="text-lg font-semibold">We could not find a recent order in this browser</h2>
        <p className="text-fg-secondary">
          If you just paid, you will get a WhatsApp message. You can also track it with your order number.
        </p>
        <Button asChild size="lg" block="responsive">
          <Link href="/track">Track an order</Link>
        </Button>
      </Card>
    );
  }

  const many = value.orders.length > 1;
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div className="flex flex-col items-start gap-3">
        <span
          className="inline-flex size-14 items-center justify-center rounded-pill bg-success-soft"
          aria-hidden
        >
          <CheckCircle2 className="size-8 text-success" />
        </span>
        <h1 className="text-2xl font-semibold md:text-3xl">
          {value.plan === "full" ? "Payment received." : "Deposit received."} Your preorder is confirmed.
        </h1>
        <p className="text-fg-secondary">
          {many
            ? "Your items arrive at different times, so you have separate orders. Keep each order number."
            : "Keep your order number. You need it to track and to pay your balance."}
        </p>
        <p className="flex items-start gap-2 text-sm text-fg-secondary">
          <MessageCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span data-testid="whatsapp-note">
            You will get updates on WhatsApp at {formatGhPhone(value.contact)}.
          </span>
        </p>
      </div>

      {value.orders.map((o, i) => (
        <LoadedOrder
          key={o.orderNumber}
          orderNumber={o.orderNumber}
          contact={value.contact}
          index={i}
          count={value.orders.length}
        />
      ))}

      <Card as="section" aria-labelledby="next-title">
        <h2 id="next-title" className="text-lg font-semibold">
          What happens next
        </h2>
        <ol className="mt-3 flex list-decimal flex-col gap-2 pl-5 text-fg-secondary">
          <li>We buy your items and ship them from China. You get a WhatsApp message at every step.</li>
          {value.plan === "deposit" && (
            <li>
              Pay your balance {businessRules.balance.dueDaysBeforeArrival} days before the container arrives
              in Ghana.
            </li>
          )}
          <li>When it lands, we prepare your order. Delivery is arranged directly with the rider.</li>
        </ol>
      </Card>
    </div>
  );
}
