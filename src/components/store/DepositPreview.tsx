import { CalendarCheck } from "lucide-react";
import { businessRules } from "@/config";
import { balanceDueDate, formatDate, isBalanceDuePassed } from "@/lib/dates";
import { formatGHS, splitPayment } from "@/lib/money";

/**
 * "Pay GH₵ X now, GH₵ Y by {date}". If the balance date has already passed for this container,
 * only full payment is offered (plan section 8).
 */
export function DepositPreview({
  totalMinor,
  expectedArrival,
  now,
}: {
  totalMinor: number;
  expectedArrival: string;
  now?: Date;
}) {
  const { depositMinor, balanceMinor } = splitPayment(totalMinor);
  const passed = isBalanceDuePassed(expectedArrival, now);
  const dueDate = formatDate(balanceDueDate(expectedArrival));

  return (
    <div className="flex items-start gap-3 rounded-card bg-subtle p-4" data-testid="deposit-preview">
      <CalendarCheck className="mt-0.5 size-5 shrink-0 text-fg-secondary" aria-hidden />
      {passed ? (
        <p className="text-sm">
          <strong className="font-semibold">Pay {formatGHS(totalMinor)} in full.</strong>{" "}
          <span className="text-fg-muted">
            The balance date for this container has passed, so we need full payment to confirm your order.
          </span>
        </p>
      ) : (
        <p className="text-sm">
          <strong className="font-semibold">
            Pay {formatGHS(depositMinor)} now ({businessRules.deposit.percent}%)
          </strong>
          , then {formatGHS(balanceMinor)} by {dueDate}.{" "}
          <span className="text-fg-muted">
            Or pay {formatGHS(totalMinor)} in full at checkout. Your price is locked once your deposit is
            paid.
          </span>
        </p>
      )}
    </div>
  );
}
