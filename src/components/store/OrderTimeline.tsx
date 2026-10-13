import { Check, Clock } from "lucide-react";
import type { Order, ProgressStep } from "@/lib/api/types";
import { cn } from "@/lib/cn";
import { formatDate, formatDateTime } from "@/lib/dates";
import { progressSteps, statusMeta, stepIndex } from "@/lib/status";

/** When did the order reach this step? Taken from the history trail, in Africa/Accra. */
function reachedAt(order: Pick<Order, "history">, step: ProgressStep): string | undefined {
  return order.history.find((h) => h.status === step)?.at;
}

/**
 * The six-step status path. A delayed order keeps its place and adds an amber banner (shown by the
 * caller via DelayedBanner); a cancelled order does not use this component at all.
 * Status is never colour alone: every step has an icon or number plus a text state.
 */
export function OrderTimeline({
  order,
}: {
  order: Pick<Order, "step" | "status" | "history" | "delayedUntil">;
}) {
  const current = stepIndex(order.step);
  const delayed = order.status === "delayed";

  return (
    <ol aria-label="Order progress" className="flex flex-col">
      {progressSteps.map((step, i) => {
        const meta = statusMeta[step];
        const done = i < current || (i === current && step === "delivered");
        const isCurrent = i === current && !done;
        const at = reachedAt(order, step);
        const Icon = meta.icon;
        const last = i === progressSteps.length - 1;
        const state = done ? "Done" : isCurrent ? (delayed ? "Delayed here" : "Current step") : "Coming up";

        return (
          <li
            key={step}
            aria-current={isCurrent ? "step" : undefined}
            className="relative flex gap-4 pb-6 last:pb-0"
            data-state={done ? "done" : isCurrent ? "current" : "upcoming"}
          >
            {!last && (
              <span
                aria-hidden
                className={cn(
                  "absolute top-10 bottom-0 left-5 w-0.5 -translate-x-1/2 rounded-pill",
                  i < current ? "bg-success" : "bg-line",
                )}
              />
            )}
            <span
              aria-hidden
              className={cn(
                "relative inline-flex size-10 shrink-0 items-center justify-center rounded-pill border-2",
                done && "border-success bg-success text-white",
                isCurrent && !delayed && "border-line-active bg-accent-soft text-info",
                isCurrent && delayed && "border-warning bg-warning-soft text-warning",
                !done && !isCurrent && "border-line bg-card text-fg-muted",
              )}
            >
              {done ? (
                <Check className="size-5" />
              ) : isCurrent && delayed ? (
                <Clock className="size-5" />
              ) : (
                <Icon className="size-5" />
              )}
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-0.5 pt-1.5">
              <p className={cn("font-medium", !done && !isCurrent && "text-fg-muted")}>
                {meta.label} <span className="sr-only">: {state}</span>
              </p>
              {at ? (
                <p className="text-sm text-fg-muted">{formatDateTime(at)}</p>
              ) : (
                <p className="text-sm text-fg-muted" aria-hidden>
                  {isCurrent ? "In progress" : done ? "" : ""}
                </p>
              )}
              {isCurrent && <p className="text-sm text-fg-secondary">{meta.meaning}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/** Calm amber banner: the customer keeps their place and sees why and when. */
export function DelayedBanner({ order }: { order: Pick<Order, "delayNote" | "delayedUntil" | "history"> }) {
  const entry = [...order.history].reverse().find((h) => h.status === "delayed");
  return (
    <div
      role="status"
      className="flex items-start gap-3 rounded-card bg-warning-soft p-4"
      data-testid="delayed-banner"
    >
      <Clock className="mt-0.5 size-5 shrink-0 text-warning" aria-hidden />
      <div className="flex flex-col gap-1 text-sm">
        <p className="font-semibold text-warning">Your order is delayed</p>
        {order.delayNote && <p className="text-fg-secondary">{order.delayNote}</p>}
        {order.delayedUntil && (
          <p className="text-fg-secondary">
            New expected arrival:{" "}
            <strong className="font-semibold text-fg">{formatDate(order.delayedUntil)}</strong>
          </p>
        )}
        {entry && <p className="text-fg-muted">Updated {formatDateTime(entry.at)}</p>}
      </div>
    </div>
  );
}
