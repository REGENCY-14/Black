"use client";

import {
  ArrowLeft,
  ArrowRight,
  Banknote,
  Clock,
  MessageCircle,
  Phone,
  PlayCircle,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { ErrorPanel, PageHeader } from "@/components/admin/states";
import { ConfirmSheet, StatusBadge } from "@/components/admin/parts";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Input, Textarea } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import {
  useAdminOrder,
  useAdvanceOrder,
  useCancelOrder,
  useMarkRefunded,
  useRecordPayment,
  useResumeOrder,
  useSession,
  useSetDelayed,
} from "@/hooks/admin";
import type { Order, RecordPaymentInput } from "@/lib/api/types";
import { formatDate, formatDateTime } from "@/lib/dates";
import { formatGHS } from "@/lib/money";
import { formatGhPhone } from "@/lib/phone";
import { balanceMinor, isAwaitingPayment, nextStep, statusMeta } from "@/lib/status";

const methodLabel: Record<string, string> = {
  mtn_momo: "MTN MoMo",
  telecel_cash: "Telecel Cash",
  airteltigo_money: "AirtelTigo Money",
  card: "Card",
  cash: "Cash",
  bank_transfer: "Bank transfer",
};
const recordMethods: { value: RecordPaymentInput["method"]; label: string }[] = [
  { value: "cash", label: "Cash" },
  { value: "bank_transfer", label: "Bank transfer" },
  { value: "mtn_momo", label: "MTN MoMo" },
  { value: "telecel_cash", label: "Telecel Cash" },
  { value: "airteltigo_money", label: "AirtelTigo Money" },
];

/** "12.50" or "12" -> pesewas, or null when it is not a positive amount. */
function parseCedis(input: string): number | null {
  const n = Number(input.replace(/,/g, "").trim());
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) : null;
}

type Sheet = null | "delay" | "payment" | "cancel";

function OrderActions({ order }: { order: Order }) {
  const { toast } = useToast();
  const session = useSession();
  const owner = session.data?.user.role === "owner";

  const advance = useAdvanceOrder();
  const delay = useSetDelayed();
  const resume = useResumeOrder();
  const pay = useRecordPayment();
  const cancel = useCancelOrder();
  const refunded = useMarkRefunded();

  const [sheet, setSheet] = useState<Sheet>(null);
  const [note, setNote] = useState("");
  const [until, setUntil] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<RecordPaymentInput["method"]>("cash");
  const [payNote, setPayNote] = useState("");
  const [formError, setFormError] = useState<string>();

  const next = nextStep(order.step);
  const cancelled = order.status === "cancelled";
  const delivered = order.step === "delivered" && !cancelled;
  const delayed = order.status === "delayed";
  const unpaid = isAwaitingPayment(order);
  const owed = balanceMinor(order);

  const close = () => {
    setSheet(null);
    setFormError(undefined);
  };

  // Why the main button cannot be used, shown as text rather than silently disabled.
  const blocked = cancelled
    ? "This order was cancelled."
    : delivered
      ? "This order has been delivered."
      : delayed
        ? "This order is delayed. Clear the delay to move it on."
        : unpaid
          ? "Record a payment before moving this order on."
          : null;

  return (
    <Card as="section" aria-labelledby="actions-title" className="flex flex-col gap-4">
      <h2 id="actions-title" className="text-lg font-semibold">
        Actions
      </h2>

      {next && !blocked ? (
        <Button
          size="lg"
          block="responsive"
          className="self-start"
          loading={advance.isPending}
          onClick={() =>
            advance.mutate(order.id, {
              onSuccess: (o) =>
                toast({
                  title: `Moved to ${statusMeta[o.status].label}`,
                  description: "The customer is notified on WhatsApp.",
                  tone: "success",
                }),
              onError: (e) => toast({ title: "Could not update", description: e.message, tone: "danger" }),
            })
          }
        >
          Mark as {statusMeta[next].label} <ArrowRight className="size-5" aria-hidden />
        </Button>
      ) : (
        blocked && <p className="text-sm text-fg-secondary">{blocked}</p>
      )}

      <div className="flex flex-wrap gap-2">
        {!cancelled && owed > 0 && (
          <Button
            variant="secondary"
            onClick={() => {
              setAmount((owed / 100).toString());
              setSheet("payment");
            }}
          >
            <Banknote className="size-4" aria-hidden /> Record payment
          </Button>
        )}
        {!cancelled && !delivered && !delayed && (
          <Button variant="secondary" onClick={() => setSheet("delay")}>
            <Clock className="size-4" aria-hidden /> Mark delayed
          </Button>
        )}
        {delayed && (
          <Button
            variant="secondary"
            loading={resume.isPending}
            onClick={() =>
              resume.mutate(order.id, { onSuccess: () => toast({ title: "Delay cleared", tone: "success" }) })
            }
          >
            <PlayCircle className="size-4" aria-hidden /> Clear delay
          </Button>
        )}
        {owner && !cancelled && !delivered && (
          <Button variant="ghost" onClick={() => setSheet("cancel")}>
            <XCircle className="size-4" aria-hidden /> Cancel order
          </Button>
        )}
        {owner && cancelled && order.refund?.status === "pending" && (
          <Button
            variant="secondary"
            loading={refunded.isPending}
            onClick={() =>
              refunded.mutate(order.id, {
                onSuccess: () => toast({ title: "Refund marked as done", tone: "success" }),
              })
            }
          >
            Mark refund as done
          </Button>
        )}
      </div>

      {/* delay */}
      <ConfirmSheet
        open={sheet === "delay"}
        onOpenChange={(o) => !o && close()}
        title="Mark this order as delayed"
        description="The customer keeps their place and sees your note."
        confirmLabel="Mark as delayed"
        loading={delay.isPending}
        error={formError}
        onConfirm={() => {
          if (note.trim().length < 3) return setFormError("Add a short note the customer will see.");
          setFormError(undefined);
          delay.mutate(
            {
              id: order.id,
              note,
              delayedUntil: until ? new Date(`${until}T00:00:00Z`).toISOString() : undefined,
            },
            {
              onSuccess: () => {
                setNote("");
                setUntil("");
                close();
                toast({ title: "Marked as delayed", tone: "success" });
              },
              onError: (e) => setFormError(e.message),
            },
          );
        }}
      >
        <Field label="Note for the customer" hint="Say what happened and when to expect news.">
          <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
        <Field label="New expected arrival" optional>
          <Input type="date" value={until} onChange={(e) => setUntil(e.target.value)} />
        </Field>
      </ConfirmSheet>

      {/* payment */}
      <ConfirmSheet
        open={sheet === "payment"}
        onOpenChange={(o) => !o && close()}
        title="Record a payment"
        description={`Balance on ${order.orderNumber} is ${formatGHS(owed)}.`}
        confirmLabel="Confirm payment received"
        loading={pay.isPending}
        error={formError}
        onConfirm={() => {
          const minor = parseCedis(amount);
          if (!minor) return setFormError("Enter an amount above zero, for example 150 or 150.50.");
          setFormError(undefined);
          pay.mutate(
            { id: order.id, input: { amountMinor: minor, method, note: payNote || undefined } },
            {
              onSuccess: () => {
                close();
                toast({ title: `${formatGHS(minor)} recorded`, tone: "success" });
              },
              onError: (e) => setFormError(e.message),
            },
          );
        }}
      >
        <Field label="Amount received (GH₵)">
          <Input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </Field>
        <Field label="How was it paid?">
          <Select
            value={method}
            onValueChange={(v) => setMethod(v as RecordPaymentInput["method"])}
            options={recordMethods}
          />
        </Field>
        <Field label="Note" optional>
          <Input value={payNote} onChange={(e) => setPayNote(e.target.value)} />
        </Field>
      </ConfirmSheet>

      {/* cancel (owner) */}
      <ConfirmSheet
        open={sheet === "cancel"}
        onOpenChange={(o) => !o && close()}
        title="Cancel this order?"
        confirmLabel="Yes, cancel order"
        cancelLabel="Keep order"
        destructive
        loading={cancel.isPending}
        error={formError}
        onConfirm={() =>
          cancel.mutate(
            { id: order.id, note },
            {
              onSuccess: () => {
                setNote("");
                close();
                toast({ title: "Order cancelled", tone: "success" });
              },
              onError: (e) => setFormError(e.message),
            },
          )
        }
      >
        <p>
          {order.paidMinor > 0
            ? `${formatGHS(order.paidMinor)} will be marked for refund to the customer's original payment method.`
            : "The customer has not paid anything, so there is nothing to refund."}
        </p>
        <Field label="Note for the customer" optional>
          <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
      </ConfirmSheet>
    </Card>
  );
}

export function OrderDetailView({ id }: { id: string }) {
  const q = useAdminOrder(id);

  if (q.isPending) {
    return (
      <div className="flex flex-col gap-4" aria-busy="true" aria-label="Loading order">
        <Skeleton className="h-24 rounded-card" />
        <Skeleton className="h-48 rounded-card" />
      </div>
    );
  }
  if (q.isError) return <ErrorPanel message={q.error.message} onRetry={() => q.refetch()} />;

  const o = q.data;
  const owed = balanceMinor(o);

  return (
    <>
      <Link
        href="/admin/orders"
        className="inline-flex min-h-hit items-center gap-1 text-sm text-fg-secondary hover:text-fg"
      >
        <ArrowLeft className="size-4" aria-hidden /> All orders
      </Link>

      <PageHeader
        title={o.orderNumber}
        description={`Placed ${formatDateTime(o.createdAt)} · ${o.batchName}`}
        actions={<StatusBadge status={o.status} />}
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_22rem] lg:items-start">
        <div className="flex flex-col gap-4">
          <OrderActions order={o} />

          <Card as="section" aria-labelledby="items-title" className="flex flex-col gap-3">
            <h2 id="items-title" className="text-lg font-semibold">
              Items
            </h2>
            <ul className="flex flex-col gap-1.5 text-sm">
              {o.items.map((it) => (
                <li key={it.productId + JSON.stringify(it.variants)} className="flex justify-between gap-4">
                  <span>
                    {it.quantity} × {it.name}
                    {Object.values(it.variants).length > 0 && (
                      <span className="text-fg-muted"> ({Object.values(it.variants).join(", ")})</span>
                    )}
                  </span>
                  <span className="tabular-nums">{formatGHS(it.unitPriceMinor * it.quantity)}</span>
                </li>
              ))}
            </ul>
            <dl className="flex flex-col gap-1 border-t border-line pt-3 text-sm">
              <div className="flex justify-between">
                <dt>Total</dt>
                <dd className="tabular-nums">{formatGHS(o.totalMinor)}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Paid</dt>
                <dd className="tabular-nums" data-testid="admin-paid">
                  {formatGHS(o.paidMinor)}
                </dd>
              </div>
              <div className="flex justify-between font-semibold">
                <dt>Balance</dt>
                <dd className="tabular-nums" data-testid="admin-balance">
                  {o.status === "cancelled"
                    ? "Cancelled"
                    : owed > 0
                      ? `${formatGHS(owed)} due ${formatDate(o.balanceDueDate)}`
                      : "Paid in full"}
                </dd>
              </div>
            </dl>
          </Card>

          <Card as="section" aria-labelledby="payments-title" className="flex flex-col gap-3">
            <h2 id="payments-title" className="text-lg font-semibold">
              Payments
            </h2>
            {o.payments.length === 0 ? (
              <p className="text-sm text-fg-secondary">No payments yet.</p>
            ) : (
              <ul className="flex flex-col divide-y divide-line text-sm">
                {o.payments.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center justify-between gap-4 py-2 first:pt-0 last:pb-0"
                  >
                    <span>
                      <span className="block font-medium">{methodLabel[p.method] ?? p.method}</span>
                      <span className="text-fg-muted">
                        {formatDateTime(p.createdAt)} · {p.reference}
                      </span>
                    </span>
                    <span className="font-semibold tabular-nums">{formatGHS(p.amountMinor)}</span>
                  </li>
                ))}
              </ul>
            )}
            {o.refund && o.refund.status !== "none" && (
              <p className="rounded-card bg-subtle p-3 text-sm" data-testid="admin-refund">
                Refund {o.refund.status === "pending" ? "pending" : "done"}: {formatGHS(o.refund.amountMinor)}
              </p>
            )}
          </Card>

          <Card as="section" aria-labelledby="history-title" className="flex flex-col gap-3">
            <h2 id="history-title" className="text-lg font-semibold">
              History
            </h2>
            {o.history.length === 0 ? (
              <p className="text-sm text-fg-secondary">
                Nothing yet. History starts when the first payment is confirmed.
              </p>
            ) : (
              <ol className="flex flex-col gap-3" data-testid="admin-history">
                {[...o.history].reverse().map((h, i) => {
                  const m = statusMeta[h.status];
                  return (
                    <li key={`${h.at}-${i}`} className="flex items-start gap-3 text-sm">
                      <span
                        className="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-pill bg-subtle"
                        aria-hidden
                      >
                        <m.icon className="size-4" />
                      </span>
                      <span>
                        <span className="block font-medium">{m.label}</span>
                        <span className="text-fg-muted">{formatDateTime(h.at)}</span>
                        {h.note && <span className="block text-fg-secondary">{h.note}</span>}
                      </span>
                    </li>
                  );
                })}
              </ol>
            )}
          </Card>
        </div>

        <Card as="aside" aria-labelledby="customer-title" className="flex flex-col gap-3">
          <h2 id="customer-title" className="text-lg font-semibold">
            Customer
          </h2>
          <div>
            <p className="font-medium">{o.customer.name}</p>
            <p className="text-sm text-fg-muted">
              {o.customer.area}, {o.customer.address}
            </p>
            {o.customer.ghanaPostGps && (
              <p className="text-sm text-fg-muted">GPS {o.customer.ghanaPostGps}</p>
            )}
            {o.customer.email && <p className="text-sm text-fg-muted">{o.customer.email}</p>}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="secondary" size="sm">
              <a href={`tel:${o.customer.phone}`}>
                <Phone className="size-4" aria-hidden /> {formatGhPhone(o.customer.phone)}
              </a>
            </Button>
            <Button asChild variant="whatsapp" size="sm">
              <a
                href={`https://wa.me/${o.customer.phone.replace("+", "")}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <MessageCircle className="size-4" aria-hidden /> WhatsApp
              </a>
            </Button>
          </div>
          {o.status === "delayed" && o.delayNote && (
            <p className="rounded-card bg-warning-soft p-3 text-sm">
              <strong className="font-semibold text-warning">Delay note:</strong> {o.delayNote}
            </p>
          )}
        </Card>
      </div>
    </>
  );
}
