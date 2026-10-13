"use client";

import { AlertCircle, CheckCircle2, Clock, Loader2, RotateCcw, Smartphone } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { businessRules } from "@/config";
import { usePaymentStatus, useStartPayment } from "@/hooks/api";
import type { PaymentAttempt, StartPaymentInput } from "@/lib/api/types";
import { formatGHS } from "@/lib/money";
import { formatGhPhone, networkLabels } from "@/lib/phone";

type View =
  | { kind: "starting" }
  | { kind: "start_error"; message: string }
  | { kind: "waiting"; reference: string }
  | { kind: "processing"; reference: string }
  | { kind: "timeout"; reference: string }
  | { kind: "failed"; reason: string };

const methodNames: Record<StartPaymentInput["method"], string> = {
  mtn_momo: networkLabels.mtn,
  telecel_cash: networkLabels.telecel,
  airteltigo_money: networkLabels.airteltigo,
  card: "card",
};

/**
 * Drives one payment from start to result and never leaves the customer on a blank screen:
 * starting, waiting for approval on the phone (with a timeout), processing, failed, success.
 * The same component serves checkout and the balance payment on /pay and Track.
 */
export function PaymentFlow({
  input,
  onSuccess,
  onChangeMethod,
}: {
  input: StartPaymentInput;
  onSuccess: (attempt: PaymentAttempt) => void;
  /** Lets the customer go back and pick another method. */
  onChangeMethod?: () => void;
}) {
  const start = useStartPayment();
  const [run, setRun] = useState(0);
  const [stored, setView] = useState<View>({ kind: "starting" });
  const [deadline, setDeadline] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const startedRun = useRef(-1);
  const settled = useRef(false);
  const total = businessRules.payment.momoApprovalTimeoutSeconds;

  // Start (or restart) the payment. The ref guard keeps StrictMode's double effect from charging twice.
  useEffect(() => {
    if (startedRun.current === run) return;
    startedRun.current = run;
    settled.current = false;
    start.mutate(input, {
      onSuccess: (a) => {
        if (a.status === "success") {
          settled.current = true;
          onSuccess(a);
        } else if (a.status === "failed") {
          setView({ kind: "failed", reason: a.failureReason ?? "The payment did not go through." });
        } else {
          setNow(Date.now());
          setDeadline(Date.now() + total * 1000);
          setView({ kind: a.awaitingApproval ? "waiting" : "processing", reference: a.reference });
        }
      },
      onError: (e) => setView({ kind: "start_error", message: e.message }),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run]);

  // Tick once a second while the approval countdown is running.
  useEffect(() => {
    if (deadline === null) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [deadline]);

  // Keep polling through "timeout" too, so a late approval still completes the order.
  const reference = "reference" in stored ? stored.reference : null;
  const polling = stored.kind === "waiting" || stored.kind === "processing" || stored.kind === "timeout";
  const status = usePaymentStatus(reference, polling);
  const polled = status.data;

  useEffect(() => {
    if (polled?.status === "success" && !settled.current) {
      settled.current = true;
      onSuccess(polled);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [polled]);

  const left = deadline === null ? total : Math.ceil((deadline - now) / 1000);
  // Derived views: a polled failure, or an expired countdown, replaces the stored view.
  const view: View =
    polling && polled?.status === "failed"
      ? { kind: "failed", reason: polled.failureReason ?? "The payment did not go through." }
      : stored.kind === "waiting" && left <= 0
        ? { kind: "timeout", reference: stored.reference }
        : stored;

  const retry = () => {
    setDeadline(null);
    setView({ kind: "starting" });
    setRun((r) => r + 1);
  };

  const isMomo = input.method !== "card";
  const method = methodNames[input.method];
  const amount = formatGHS(input.amountMinor);
  const mins = Math.floor(Math.max(0, left) / 60);
  const secs = String(Math.max(0, left) % 60).padStart(2, "0");

  return (
    <Card
      size="lg"
      className="mx-auto flex max-w-xl flex-col items-center gap-5 text-center"
      data-testid="payment-flow"
    >
      <div aria-live="polite" className="flex flex-col items-center gap-4">
        {view.kind === "starting" && (
          <>
            <Loader2 className="size-10 animate-spin text-fg-secondary" aria-hidden />
            <h2 className="text-xl font-semibold">Starting your payment</h2>
            <p className="text-fg-secondary">This takes a few seconds. Please keep this page open.</p>
          </>
        )}

        {view.kind === "waiting" && (
          <>
            <span
              className="inline-flex size-14 items-center justify-center rounded-pill bg-accent-soft"
              aria-hidden
            >
              <Smartphone className="size-7 text-info" />
            </span>
            <h2 className="text-xl font-semibold">Waiting for approval on your phone</h2>
            <p className="text-fg-secondary">
              We sent a {method} prompt for <strong className="text-fg">{amount}</strong> to{" "}
              <strong className="text-fg">{input.phone ? formatGhPhone(input.phone) : "your phone"}</strong>.
              Open it and enter your PIN to approve.
            </p>
            <p className="flex items-center gap-2 text-sm text-fg-muted tabular-nums">
              <Clock className="size-4" aria-hidden /> Time left {mins}:{secs}
            </p>
          </>
        )}

        {view.kind === "processing" && (
          <>
            <Loader2 className="size-10 animate-spin text-fg-secondary" aria-hidden />
            <h2 className="text-xl font-semibold">Payment is processing</h2>
            <p className="text-fg-secondary">
              Your bank or provider has not confirmed yet. We will update this page as soon as it does. Do not
              pay again.
            </p>
          </>
        )}

        {view.kind === "timeout" && (
          <>
            <span
              className="inline-flex size-14 items-center justify-center rounded-pill bg-warning-soft"
              aria-hidden
            >
              <Clock className="size-7 text-warning" />
            </span>
            <h2 className="text-xl font-semibold">We have not received your approval</h2>
            <p className="text-fg-secondary">
              If you approved on your phone, wait a moment and check again. If you did not see a prompt, check
              that {input.phone ? formatGhPhone(input.phone) : "the number"} is right and has enough balance,
              then try again.
            </p>
          </>
        )}

        {view.kind === "failed" && (
          <>
            <span
              className="inline-flex size-14 items-center justify-center rounded-pill bg-danger-soft"
              aria-hidden
            >
              <AlertCircle className="size-7 text-danger" />
            </span>
            <h2 className="text-xl font-semibold">Payment did not go through</h2>
            <p className="text-fg-secondary" role="alert">
              {view.reason}
            </p>
            <p className="text-sm text-fg-muted">You have not been charged for this attempt.</p>
          </>
        )}

        {view.kind === "start_error" && (
          <>
            <span
              className="inline-flex size-14 items-center justify-center rounded-pill bg-danger-soft"
              aria-hidden
            >
              <AlertCircle className="size-7 text-danger" />
            </span>
            <h2 className="text-xl font-semibold">We could not start the payment</h2>
            <p className="text-fg-secondary" role="alert">
              {view.message}
            </p>
          </>
        )}
      </div>

      <div className="flex w-full flex-col gap-3 sm:flex-row sm:justify-center">
        {view.kind === "timeout" && (
          <Button
            size="lg"
            block="responsive"
            onClick={() => {
              setView({ kind: "processing", reference: view.reference });
            }}
          >
            <CheckCircle2 className="size-5" aria-hidden /> I approved, check again
          </Button>
        )}
        {(view.kind === "timeout" || view.kind === "failed" || view.kind === "start_error") && (
          <Button
            size="lg"
            variant={view.kind === "timeout" ? "secondary" : "primary"}
            block="responsive"
            onClick={retry}
          >
            <RotateCcw className="size-5" aria-hidden /> Try again
          </Button>
        )}
        {(view.kind === "timeout" || view.kind === "failed" || view.kind === "start_error") &&
          onChangeMethod && (
            <Button size="lg" variant="secondary" block="responsive" onClick={onChangeMethod}>
              Change payment method
            </Button>
          )}
      </div>

      {isMomo && view.kind === "waiting" && (
        <p className="text-sm text-fg-muted">Never share your PIN with anyone. We will never ask for it.</p>
      )}
    </Card>
  );
}
