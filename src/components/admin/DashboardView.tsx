"use client";

import { ArrowRight, Plus } from "lucide-react";
import Link from "next/link";
import { ErrorPanel, PageHeader } from "@/components/admin/states";
import { StatusBadge, initials } from "@/components/admin/parts";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { useDashboard, useSession } from "@/hooks/admin";
import { dateTileParts, formatArrivalWindow, relativeDays } from "@/lib/dates";
import { formatGHS } from "@/lib/money";

export function DashboardView() {
  const session = useSession();
  const q = useDashboard();
  const owner = session.data?.user.role === "owner";

  return (
    <>
      <PageHeader
        title={`Hello, ${session.data?.user.name.split(" ")[0] ?? ""}`}
        description="Here is what needs attention today."
        actions={
          owner && (
            <Button asChild>
              <Link prefetch={false} href="/admin/products/new">
                <Plus className="size-4" aria-hidden /> Add product
              </Link>
            </Button>
          )
        }
      />

      {q.isPending ? (
        <div className="grid gap-4 md:grid-cols-3" aria-busy="true">
          <Skeleton className="h-36 rounded-card" />
          <Skeleton className="h-36 rounded-card" />
          <Skeleton className="h-36 rounded-card" />
        </div>
      ) : q.isError ? (
        <ErrorPanel message={q.error.message} onRetry={() => q.refetch()} />
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <Card as="section" aria-labelledby="awaiting-title" className="flex flex-col gap-2">
              <h2 id="awaiting-title" className="text-sm text-fg-muted">
                Orders awaiting action
              </h2>
              <p className="text-3xl font-semibold tabular-nums" data-testid="awaiting-count">
                {q.data.awaitingAction}
              </p>
              <p className="text-sm text-fg-secondary">
                New paid orders, unpaid orders, and containers that arrived.
              </p>
              <Link
                prefetch={false}
                href="/admin/orders"
                className="mt-auto inline-flex min-h-hit items-center gap-1 text-sm font-medium"
              >
                Open orders <ArrowRight className="size-4" aria-hidden />
              </Link>
            </Card>

            <Card as="section" aria-labelledby="balances-title" className="flex flex-col gap-2">
              <h2 id="balances-title" className="text-sm text-fg-muted">
                Balances outstanding
              </h2>
              <p className="text-3xl font-semibold tabular-nums" data-testid="balances-total">
                {formatGHS(q.data.balancesOutstandingMinor)}
              </p>
              <p className="text-sm text-fg-secondary">
                Across {q.data.balancesOutstandingCount}{" "}
                {q.data.balancesOutstandingCount === 1 ? "order" : "orders"}.
              </p>
              <Link
                prefetch={false}
                href="/admin/orders?balance=1"
                className="mt-auto inline-flex min-h-hit items-center gap-1 text-sm font-medium"
              >
                See who owes <ArrowRight className="size-4" aria-hidden />
              </Link>
            </Card>

            <Card as="section" aria-labelledby="next-batch-title" className="flex flex-col gap-2">
              <h2 id="next-batch-title" className="text-sm text-fg-muted">
                Next container arrives
              </h2>
              {q.data.nextBatch ? (
                <>
                  <p className="flex items-baseline gap-2">
                    <span className="text-3xl font-semibold tabular-nums">
                      {dateTileParts(q.data.nextBatch.expectedArrival).day}
                    </span>
                    <span className="text-xl font-medium text-fg-faint">
                      {dateTileParts(q.data.nextBatch.expectedArrival).month}
                    </span>
                  </p>
                  <p className="text-sm text-fg-secondary">
                    {q.data.nextBatch.name} · {relativeDays(q.data.nextBatch.expectedArrival)} ·{" "}
                    {formatArrivalWindow(q.data.nextBatch.expectedArrival)}
                  </p>
                </>
              ) : (
                <p className="text-fg-secondary">No container on the way.</p>
              )}
              <Link
                prefetch={false}
                href="/admin/batches"
                className="mt-auto inline-flex min-h-hit items-center gap-1 text-sm font-medium"
              >
                Open batches <ArrowRight className="size-4" aria-hidden />
              </Link>
            </Card>
          </div>

          <Card as="section" aria-labelledby="recent-title" className="flex flex-col gap-2">
            <h2 id="recent-title" className="text-lg font-semibold">
              Recent orders
            </h2>
            <ul className="flex flex-col divide-y divide-line">
              {q.data.recentOrders.map((o) => (
                <li key={o.id}>
                  <Link
                    prefetch={false}
                    href={`/admin/orders/${o.id}`}
                    className="flex min-h-16 items-center gap-3 py-3"
                  >
                    <span
                      className="inline-flex size-10 shrink-0 items-center justify-center rounded-pill bg-subtle text-sm font-semibold"
                      aria-hidden
                    >
                      {initials(o.customer.name)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{o.orderNumber}</span>
                      <span className="block truncate text-sm text-fg-muted">{o.customer.name}</span>
                    </span>
                    <span className="hidden sm:block">
                      <StatusBadge status={o.status} />
                    </span>
                    <span className="shrink-0 text-sm font-semibold tabular-nums">
                      {formatGHS(o.totalMinor)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        </>
      )}
    </>
  );
}
