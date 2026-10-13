"use client";

import { Search } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { EmptyPanel, ErrorPanel, ListSkeleton, PageHeader } from "@/components/admin/states";
import { StatusBadge } from "@/components/admin/parts";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useAdminBatches, useAdminOrders } from "@/hooks/admin";
import type { AdminOrderQuery, Batch, Order, OrderStatus } from "@/lib/api/types";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/dates";
import { formatGHS } from "@/lib/money";
import { statusMeta, balanceMinor } from "@/lib/status";

const statusOptions = [
  { value: "all", label: "All statuses" },
  ...(Object.keys(statusMeta) as OrderStatus[]).map((s) => ({ value: s, label: statusMeta[s].label })),
];

/** Table from md up, stacked cards on phones. Shared by the orders page and a batch's detail page. */
export function OrdersTable({ orders, batches }: { orders: Order[]; batches?: Batch[] }) {
  const batchName = (id: string) => batches?.find((b) => b.id === id)?.name ?? id;
  return (
    <>
      <ul className="flex flex-col gap-3 md:hidden" aria-label="Orders">
        {orders.map((o) => (
          <li key={o.id}>
            <Link
              href={`/admin/orders/${o.id}`}
              className="flex flex-col gap-3 rounded-card bg-card p-4 shadow-card"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold">{o.orderNumber}</p>
                  <p className="truncate text-sm text-fg-muted">
                    {o.customer.name} · {o.customer.phone}
                  </p>
                </div>
                <StatusBadge status={o.status} />
              </div>
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="text-fg-secondary tabular-nums">
                  Paid {formatGHS(o.paidMinor)} of {formatGHS(o.totalMinor)}
                </span>
                {o.status !== "cancelled" && balanceMinor(o) > 0 && (
                  <span className="font-medium text-warning tabular-nums">
                    Owes {formatGHS(balanceMinor(o))}
                  </span>
                )}
              </div>
            </Link>
          </li>
        ))}
      </ul>

      <div className="hidden overflow-x-auto rounded-card bg-card shadow-card md:block">
        <table className="w-full min-w-176 text-left text-sm">
          <caption className="sr-only">Orders</caption>
          <thead>
            <tr className="border-b border-line text-fg-muted">
              {["Order", "Customer", "Status", "Paid", "Balance", "Container"].map((h) => (
                <th key={h} scope="col" className="px-4 py-3 font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {orders.map((o) => (
              <tr key={o.id} className="hover:bg-subtle">
                <td className="px-4 py-3">
                  <Link href={`/admin/orders/${o.id}`} className="font-semibold hover:underline">
                    {o.orderNumber}
                  </Link>
                  <p className="text-fg-muted">{formatDate(o.createdAt)}</p>
                </td>
                <td className="px-4 py-3">
                  <p className="font-medium">{o.customer.name}</p>
                  <p className="text-fg-muted">{o.customer.phone}</p>
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={o.status} />
                </td>
                <td className="px-4 py-3 tabular-nums">
                  {formatGHS(o.paidMinor)} <span className="text-fg-muted">of {formatGHS(o.totalMinor)}</span>
                </td>
                <td className="px-4 py-3 tabular-nums">
                  {o.status === "cancelled" ? (
                    <span className="text-fg-muted">Cancelled</span>
                  ) : balanceMinor(o) > 0 ? (
                    <span className="font-medium text-warning">{formatGHS(balanceMinor(o))}</span>
                  ) : (
                    <span className="text-success">Paid</span>
                  )}
                </td>
                <td className="px-4 py-3 text-fg-secondary">{batchName(o.batchId)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

export function OrdersView({
  initialBalance = false,
  initialStatus = "all",
}: {
  initialBalance?: boolean;
  initialStatus?: string;
}) {
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [status, setStatus] = useState(initialStatus);
  const [batchId, setBatchId] = useState("all");
  const [owing, setOwing] = useState(initialBalance);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 250);
    return () => clearTimeout(t);
  }, [search]);

  const query: AdminOrderQuery = {
    search: debounced || undefined,
    status: status as AdminOrderQuery["status"],
    batchId: batchId === "all" ? undefined : batchId,
    balanceOutstanding: owing || undefined,
  };
  const orders = useAdminOrders(query);
  const batches = useAdminBatches();
  const batchList = batches.data?.map((b) => b.batch);
  const filtered = debounced || status !== "all" || batchId !== "all" || owing;

  const clear = () => {
    setSearch("");
    setDebounced("");
    setStatus("all");
    setBatchId("all");
    setOwing(false);
  };

  return (
    <>
      <PageHeader title="Orders" description="Search, filter and move orders along." />

      <div className="flex flex-col gap-3">
        <div className="relative">
          <Search
            className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-fg-muted"
            aria-hidden
          />
          <Input
            type="search"
            inputMode="search"
            aria-label="Search orders"
            placeholder="Order number, name or phone"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-12"
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
          <Select
            aria-label="Filter by status"
            value={status}
            onValueChange={setStatus}
            options={statusOptions}
          />
          <Select
            aria-label="Filter by container"
            value={batchId}
            onValueChange={setBatchId}
            options={[
              { value: "all", label: "All containers" },
              ...(batchList?.map((b) => ({ value: b.id, label: b.name })) ?? []),
            ]}
          />
          <button
            type="button"
            aria-pressed={owing}
            onClick={() => setOwing((v) => !v)}
            className={cn(
              "inline-flex h-control-md items-center justify-center rounded-input border px-4 text-sm font-medium transition-colors",
              owing
                ? "border-primary bg-primary text-primary-fg"
                : "border-line bg-card text-fg hover:bg-subtle",
            )}
          >
            Balance outstanding
          </button>
        </div>
      </div>

      <p className="text-sm text-fg-muted" aria-live="polite">
        {orders.isPending ? "Loading orders" : `${orders.data?.length ?? 0} orders`}
      </p>

      {orders.isPending ? (
        <ListSkeleton />
      ) : orders.isError ? (
        <ErrorPanel message={orders.error.message} onRetry={() => orders.refetch()} />
      ) : orders.data.length === 0 ? (
        <EmptyPanel
          title="No orders match"
          text="Try a different search or clear the filters."
          action={
            filtered ? (
              <Button variant="secondary" onClick={clear}>
                Clear filters
              </Button>
            ) : undefined
          }
        />
      ) : (
        <OrdersTable orders={orders.data} batches={batchList} />
      )}
    </>
  );
}
