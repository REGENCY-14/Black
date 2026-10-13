"use client";

import { ArrowLeft, ArrowRight, Users } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { EmptyPanel, ErrorPanel, ListSkeleton, PageHeader } from "@/components/admin/states";
import { ConfirmSheet } from "@/components/admin/parts";
import { OrdersTable } from "@/components/admin/OrdersView";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { useAdminBatches, useAdminOrders, useAdvanceBatch } from "@/hooks/admin";
import type { Batch, BatchStatus, BatchSummary, ProgressStep } from "@/lib/api/types";
import { formatArrivalWindow, formatDate, relativeDays } from "@/lib/dates";
import { statusMeta, stepIndex } from "@/lib/status";

const ladder: BatchStatus[] = ["sourcing", "shipped_from_china", "arrived_in_ghana"];
const nextBatchStatus = (s: BatchStatus): BatchStatus | null => ladder[ladder.indexOf(s) + 1] ?? null;

/** Counts shown in the confirmation: who moves, who is notified, who is skipped. Loaded only when the sheet opens. */
function Impact({ batchId, target }: { batchId: string; target: ProgressStep }) {
  const q = useAdminOrders({ batchId });
  if (q.isPending) return <Skeleton className="h-16 rounded-card" />;
  if (q.isError)
    return (
      <p role="alert" className="text-sm text-danger">
        {q.error.message}
      </p>
    );

  const live = q.data.filter((o) => o.status !== "cancelled" && o.step !== "delivered" && o.paidMinor > 0);
  const delayed = live.filter((o) => o.status === "delayed").length;
  const moving = live.filter((o) => o.status !== "delayed" && stepIndex(o.step) < stepIndex(target));
  const customers = new Set(moving.map((o) => o.customer.phone)).size;

  return (
    <ul className="flex flex-col gap-2 rounded-card bg-subtle p-4 text-sm" data-testid="batch-impact">
      <li>
        <strong className="font-semibold text-fg" data-testid="impact-orders">
          {moving.length}
        </strong>{" "}
        {moving.length === 1 ? "order moves" : "orders move"} to{" "}
        <strong className="font-semibold text-fg">{statusMeta[target].label}</strong>.
      </li>
      <li className="flex items-center gap-2">
        <Users className="size-4" aria-hidden />
        <span>
          <strong className="font-semibold text-fg" data-testid="impact-customers">
            {customers}
          </strong>{" "}
          {customers === 1 ? "customer is" : "customers are"} notified on WhatsApp (SMS if WhatsApp fails).
        </span>
      </li>
      {delayed > 0 && (
        <li>
          {delayed} delayed {delayed === 1 ? "order stays" : "orders stay"} as{" "}
          {delayed === 1 ? "it is" : "they are"}. Clear the delay to include them.
        </li>
      )}
    </ul>
  );
}

export function BatchAdvance({ batch, size = "md" }: { batch: Batch; size?: "md" | "lg" }) {
  const { toast } = useToast();
  const advance = useAdvanceBatch();
  const [open, setOpen] = useState(false);
  const next = nextBatchStatus(batch.status);

  if (!next) {
    return <Badge tone="success">Arrived in Ghana</Badge>;
  }
  const target = next as ProgressStep;

  return (
    <>
      <Button size={size} onClick={() => setOpen(true)}>
        Mark as {statusMeta[target].label} <ArrowRight className="size-4" aria-hidden />
      </Button>
      <ConfirmSheet
        open={open}
        onOpenChange={setOpen}
        title={`Move ${batch.name} to ${statusMeta[target].label}?`}
        description="Every paid, active order in this container moves one stage."
        confirmLabel={`Yes, mark as ${statusMeta[target].label}`}
        cancelLabel="Not yet"
        loading={advance.isPending}
        error={advance.isError ? advance.error.message : undefined}
        onConfirm={() =>
          advance.mutate(batch.id, {
            onSuccess: (r) => {
              setOpen(false);
              toast({
                title: `${r.updated} ${r.updated === 1 ? "order" : "orders"} moved`,
                description: `${r.notified} ${r.notified === 1 ? "customer" : "customers"} notified.`,
                tone: "success",
              });
            },
          })
        }
      >
        {open && <Impact batchId={batch.id} target={target} />}
      </ConfirmSheet>
    </>
  );
}

function BatchCard({ s }: { s: BatchSummary }) {
  const m = statusMeta[s.batch.status === "sourcing" ? "sourcing" : (s.batch.status as ProgressStep)];
  return (
    <Card
      as="article"
      aria-labelledby={`b-${s.batch.id}`}
      className="flex flex-col gap-4"
      data-testid={`batch-${s.batch.id}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id={`b-${s.batch.id}`} className="text-lg font-semibold">
            <Link href={`/admin/batches/${s.batch.id}`} className="hover:underline">
              {s.batch.name}
            </Link>
          </h2>
          <p className="text-sm text-fg-muted">
            Arrives {formatDate(s.batch.expectedArrival)} · {relativeDays(s.batch.expectedArrival)}
          </p>
        </div>
        <Badge tone={m.tone} icon={<m.icon />} data-testid="batch-status">
          {m.label}
        </Badge>
      </div>
      <dl className="grid grid-cols-3 gap-3 text-sm">
        <div>
          <dt className="text-fg-muted">Orders</dt>
          <dd className="text-xl font-semibold tabular-nums">{s.orderCount}</dd>
        </div>
        <div>
          <dt className="text-fg-muted">Customers</dt>
          <dd className="text-xl font-semibold tabular-nums">{s.customerCount}</dd>
        </div>
        <div>
          <dt className="text-fg-muted">Delayed</dt>
          <dd className="text-xl font-semibold tabular-nums">{s.delayedCount}</dd>
        </div>
      </dl>
      <div className="flex flex-wrap items-center gap-3">
        <BatchAdvance batch={s.batch} />
        <Button asChild variant="ghost">
          <Link href={`/admin/batches/${s.batch.id}`}>See orders</Link>
        </Button>
      </div>
    </Card>
  );
}

export function BatchesView() {
  const q = useAdminBatches();
  return (
    <>
      <PageHeader
        title="Batches"
        description="Containers shipped together. Move a whole container in one step."
      />
      {q.isPending ? (
        <ListSkeleton rows={3} />
      ) : q.isError ? (
        <ErrorPanel message={q.error.message} onRetry={() => q.refetch()} />
      ) : q.data.length === 0 ? (
        <EmptyPanel title="No batches yet" />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {q.data.map((s) => (
            <BatchCard key={s.batch.id} s={s} />
          ))}
        </div>
      )}
    </>
  );
}

export function BatchDetailView({ id }: { id: string }) {
  const batches = useAdminBatches();
  const orders = useAdminOrders({ batchId: id });
  const summary = batches.data?.find((b) => b.batch.id === id);

  return (
    <>
      <Link
        href="/admin/batches"
        className="inline-flex min-h-hit items-center gap-1 text-sm text-fg-secondary hover:text-fg"
      >
        <ArrowLeft className="size-4" aria-hidden /> All batches
      </Link>
      {batches.isPending ? (
        <ListSkeleton rows={2} />
      ) : batches.isError ? (
        <ErrorPanel message={batches.error.message} onRetry={() => batches.refetch()} />
      ) : !summary ? (
        <EmptyPanel title="Batch not found" />
      ) : (
        <>
          <PageHeader
            title={summary.batch.name}
            description={`Arrives ${formatArrivalWindow(summary.batch.expectedArrival)} · ${summary.orderCount} orders · ${summary.customerCount} customers`}
            actions={<BatchAdvance batch={summary.batch} size="lg" />}
          />
          {orders.isPending ? (
            <ListSkeleton />
          ) : orders.isError ? (
            <ErrorPanel message={orders.error.message} onRetry={() => orders.refetch()} />
          ) : orders.data.length === 0 ? (
            <EmptyPanel title="No orders in this container yet" />
          ) : (
            <OrdersTable orders={orders.data} batches={[summary.batch]} />
          )}
        </>
      )}
    </>
  );
}
