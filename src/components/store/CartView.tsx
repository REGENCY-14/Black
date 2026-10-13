"use client";

import { ArrowRight, Info, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { BottomBar } from "@/components/layout/BottomBar";
import { CartLineRow } from "@/components/store/CartLineRow";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { businessRules } from "@/config";
import { useBatches } from "@/hooks/api";
import { useCartLines } from "@/hooks/useHydrated";
import { canPayDeposit, groupCart, totalsFor } from "@/lib/checkout";
import { formatArrivalWindow, formatDate } from "@/lib/dates";
import { formatGHS } from "@/lib/money";

export function CartView() {
  const { lines, hydrated } = useCartLines();
  const batches = useBatches();

  if (!hydrated || (lines.length > 0 && batches.isPending)) {
    return (
      <div className="flex flex-col gap-4" aria-busy="true" aria-label="Loading your cart">
        <Skeleton className="h-40 rounded-card" />
        <Skeleton className="h-40 rounded-card" />
      </div>
    );
  }

  if (lines.length === 0) {
    return (
      <Card className="flex flex-col items-start gap-4 p-6 md:p-8">
        <span className="inline-flex size-12 items-center justify-center rounded-pill bg-subtle" aria-hidden>
          <ShoppingBag className="size-6 text-fg-secondary" />
        </span>
        <div>
          <h2 className="text-lg font-semibold">Your cart is empty</h2>
          <p className="text-fg-secondary">Pick something to preorder and it will wait for you here.</p>
        </div>
        <Button asChild size="lg" block="responsive">
          <Link href="/shop">Browse preorders</Link>
        </Button>
      </Card>
    );
  }

  if (batches.isError) {
    return (
      <div role="alert" className="flex flex-col items-start gap-3 rounded-card bg-danger-soft p-5">
        <p className="font-medium text-danger">We could not load arrival dates for your items.</p>
        <Button variant="secondary" size="sm" onClick={() => batches.refetch()}>
          Try again
        </Button>
      </div>
    );
  }

  const groups = groupCart(lines, batches.data ?? []);
  const deposit = totalsFor(groups, "deposit");
  const depositOk = canPayDeposit(groups);
  const split = groups.length > 1;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_24rem] lg:items-start">
      <div className="flex flex-col gap-4">
        {split && (
          <div role="note" className="flex items-start gap-3 rounded-card bg-info-soft p-4 text-sm">
            <Info className="mt-0.5 size-5 shrink-0 text-info" aria-hidden />
            <p>
              <strong className="font-semibold">Your items arrive at different times,</strong> so they will be
              placed as {groups.length} separate orders. Each one is tracked and delivered on its own.
            </p>
          </div>
        )}

        {groups.map((g, i) => (
          <Card key={g.batch.id} as="section" aria-labelledby={`group-${g.batch.id}`}>
            <div className="mb-4 flex flex-col gap-0.5 border-b border-line pb-4">
              <h2 id={`group-${g.batch.id}`} className="font-semibold">
                {split ? `Order ${i + 1}: ` : ""}Arrives {formatArrivalWindow(g.batch.expectedArrival)}
              </h2>
              <p className="text-sm text-fg-muted">
                Balance due {formatDate(g.balanceDueDate)} ({businessRules.balance.dueDaysBeforeArrival} days
                before arrival)
              </p>
            </div>
            <ul className="divide-y divide-line">
              {g.lines.map((l) => (
                <CartLineRow key={l.key} line={l} />
              ))}
            </ul>
            <p className="mt-4 flex justify-between border-t border-line pt-4 text-sm">
              <span className="text-fg-secondary">{split ? "Order subtotal" : "Subtotal"}</span>
              <span className="font-semibold tabular-nums">{formatGHS(g.subtotalMinor)}</span>
            </p>
          </Card>
        ))}
      </div>

      <Card as="section" aria-labelledby="cart-summary" className="flex flex-col gap-4 lg:sticky lg:top-24">
        <h2 id="cart-summary" className="text-lg font-semibold">
          Summary
        </h2>
        <dl className="flex flex-col gap-2 text-sm">
          {groups.map((g, i) => (
            <div key={g.batch.id} className="flex justify-between gap-4">
              <dt className="text-fg-secondary">{split ? `Order ${i + 1}` : "Items"}</dt>
              <dd className="tabular-nums">{formatGHS(g.subtotalMinor)}</dd>
            </div>
          ))}
          <div className="flex justify-between gap-4 border-t border-line pt-3 text-base">
            <dt className="font-semibold">Total</dt>
            <dd className="font-semibold tabular-nums" data-testid="cart-total">
              {formatGHS(deposit.totalMinor)}
            </dd>
          </div>
        </dl>
        <p className="text-sm text-fg-muted">
          {depositOk
            ? `Pay ${formatGHS(deposit.dueNowMinor)} now (${businessRules.deposit.percent}%), or pay in full at checkout.`
            : "Full payment is needed for the items arriving soonest."}{" "}
          Prices include shipping from China and duty. Delivery is arranged with the rider.
        </p>
        <Button asChild size="lg" block="always" className="hidden md:inline-flex">
          <Link href="/checkout">
            Checkout <ArrowRight className="size-5" aria-hidden />
          </Link>
        </Button>
        <Button asChild variant="ghost" block="always">
          <Link href="/shop">Continue shopping</Link>
        </Button>
      </Card>

      <BottomBar>
        <div className="flex items-center gap-4">
          <div className="min-w-0">
            <p className="text-sm text-fg-muted">Total</p>
            <p className="font-semibold tabular-nums">{formatGHS(deposit.totalMinor)}</p>
          </div>
          <div className="flex-1">
            <Button asChild size="lg" block="always">
              <Link href="/checkout">
                Checkout <ArrowRight className="size-5" aria-hidden />
              </Link>
            </Button>
          </div>
        </div>
      </BottomBar>
    </div>
  );
}
