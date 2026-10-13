"use client";

import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, CreditCard } from "lucide-react";
import { useState } from "react";
import { PaymentFlow } from "@/components/store/PaymentFlow";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { PhoneInput } from "@/components/ui/Input";
import { RadioCard } from "@/components/ui/RadioCard";
import { keys } from "@/hooks/api";
import type { Order, OrderLookup, PaymentMethod, StartPaymentInput } from "@/lib/api/types";
import { formatDate } from "@/lib/dates";
import { formatGHS } from "@/lib/money";
import { detectNetwork, isValidGhPhone, normalizeGhPhone, type MomoNetwork } from "@/lib/phone";
import { balanceMinor } from "@/lib/status";

const methodForNetwork: Record<MomoNetwork, PaymentMethod> = {
  mtn: "mtn_momo",
  telecel: "telecel_cash",
  airteltigo: "airteltigo_money",
};
const networkForMethod: Partial<Record<PaymentMethod, MomoNetwork>> = {
  mtn_momo: "mtn",
  telecel_cash: "telecel",
  airteltigo_money: "airteltigo",
};
const methods: { value: PaymentMethod; label: string; description: string }[] = [
  { value: "mtn_momo", label: "MTN MoMo", description: "Approve a prompt on your phone." },
  { value: "telecel_cash", label: "Telecel Cash", description: "Approve a prompt on your phone." },
  { value: "airteltigo_money", label: "AirtelTigo Money", description: "Approve a prompt on your phone." },
  { value: "card", label: "Card", description: "Visa or Mastercard, entered on the secure payment page." },
];

/**
 * Pays what is left on one order, from Track (inside a sheet) or /pay (inline). It reuses the same
 * PaymentFlow as checkout, so waiting, timeout, failure and success behave identically.
 */
export function BalancePayment({
  order,
  lookup,
  onPaid,
}: {
  order: Order;
  lookup: OrderLookup;
  onPaid?: (order: Order) => void;
}) {
  const qc = useQueryClient();
  const amount = balanceMinor(order);
  const detected = detectNetwork(order.customer.phone);
  const [method, setMethod] = useState<PaymentMethod>(detected ? methodForNetwork[detected] : "mtn_momo");
  const [wallet, setWallet] = useState(order.customer.phone);
  const [walletError, setWalletError] = useState<string>();
  const [started, setStarted] = useState<StartPaymentInput | null>(null);
  const [paid, setPaid] = useState(false);

  if (paid) {
    return (
      <Card className="flex flex-col items-start gap-3" role="status" data-testid="balance-paid">
        <span
          className="inline-flex size-12 items-center justify-center rounded-pill bg-success-soft"
          aria-hidden
        >
          <CheckCircle2 className="size-7 text-success" />
        </span>
        <h2 className="text-xl font-semibold">Balance paid. Thank you.</h2>
        <p className="text-fg-secondary">
          Order {order.orderNumber} is fully paid. We will message you on WhatsApp when it moves to the next
          step.
        </p>
      </Card>
    );
  }

  if (started) {
    return (
      <PaymentFlow
        input={started}
        onChangeMethod={() => setStarted(null)}
        onSuccess={() => {
          void qc.invalidateQueries({ queryKey: keys.order(lookup) });
          setPaid(true);
          onPaid?.(order);
        }}
      />
    );
  }

  const start = () => {
    if (method !== "card" && !isValidGhPhone(wallet)) {
      setWalletError("Enter the Mobile Money number that will pay, for example 024 123 4567.");
      return;
    }
    setWalletError(undefined);
    setStarted({
      orderIds: [order.id],
      amountMinor: amount,
      kind: "balance",
      method,
      phone: method === "card" ? undefined : normalizeGhPhone(wallet)!,
      network: networkForMethod[method],
    });
  };

  return (
    <div className="flex flex-col gap-5" data-testid="balance-payment">
      <dl className="flex flex-col gap-1 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-fg-secondary">Order total</dt>
          <dd className="tabular-nums">{formatGHS(order.totalMinor)}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-fg-secondary">Paid so far</dt>
          <dd className="tabular-nums">{formatGHS(order.paidMinor)}</dd>
        </div>
        <div className="flex justify-between gap-4 border-t border-line pt-2 text-base font-semibold">
          <dt>Balance to pay</dt>
          <dd className="tabular-nums" data-testid="balance-amount">
            {formatGHS(amount)}
          </dd>
        </div>
        <div className="flex justify-between gap-4 text-fg-muted">
          <dt>Due by</dt>
          <dd>{formatDate(order.balanceDueDate)}</dd>
        </div>
      </dl>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-1 text-sm font-medium">Payment method</legend>
        {methods.map((m) => (
          <RadioCard
            key={m.value}
            name="balance-method"
            value={m.value}
            label={m.label}
            description={m.description}
            checked={method === m.value}
            onChange={() => setMethod(m.value)}
          />
        ))}
      </fieldset>

      {method !== "card" ? (
        <Field
          label="Mobile Money number"
          hint="You will approve the payment on this number."
          error={walletError}
        >
          <PhoneInput autoComplete="off" value={wallet} onChange={(e) => setWallet(e.target.value)} />
        </Field>
      ) : (
        <p className="flex items-start gap-2 text-sm text-fg-secondary">
          <CreditCard className="mt-0.5 size-4 shrink-0" aria-hidden /> Card details are entered with our
          payment provider. We never see or store your card number.
        </p>
      )}

      <Button size="lg" variant="accent" block="responsive" className="self-start" onClick={start}>
        Pay {formatGHS(amount)}
      </Button>
    </div>
  );
}
