"use client";

import { RotateCcw, WifiOff } from "lucide-react";
import { useEffect, useState } from "react";
import { OrderLookupForm } from "@/components/store/OrderLookupForm";
import { OrderResult } from "@/components/store/OrderResult";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { useOrder } from "@/hooks/api";
import { useOnline } from "@/hooks/useOnline";
import { ApiError, type OrderLookup } from "@/lib/api/types";
import { readLastTracked, saveLastTracked } from "@/lib/lastTracked";
import { normalizeOrderNumber } from "@/lib/phone";

/**
 * Track by order number + phone/email (SRS 4.5). Remembers the last tracked order on this device
 * and keeps a saved copy so the last known status still shows when offline.
 */
export function TrackView({ initialOrderNumber }: { initialOrderNumber?: string }) {
  const online = useOnline();
  // Runs only on the client (the page wraps this in Suspense because of useSearchParams).
  const [remembered] = useState(() => readLastTracked());
  const wanted = initialOrderNumber ? normalizeOrderNumber(initialOrderNumber) : undefined;
  const sameOrder = !!remembered && (!wanted || remembered.orderNumber === wanted);

  // A link to /track?order=X opens straight away when this device already knows the contact for X.
  const [lookup, setLookup] = useState<OrderLookup | null>(
    wanted && remembered && remembered.orderNumber === wanted
      ? { orderNumber: remembered.orderNumber, contact: remembered.contact }
      : null,
  );
  const [prefill, setPrefill] = useState<OrderLookup | null>(
    remembered && sameOrder
      ? { orderNumber: wanted ?? remembered.orderNumber, contact: remembered.contact }
      : null,
  );
  const q = useOrder(lookup);

  useEffect(() => {
    if (q.data && lookup) {
      saveLastTracked({
        orderNumber: q.data.orderNumber,
        contact: lookup.contact,
        snapshot: q.data,
        savedAt: new Date().toISOString(),
      });
    }
  }, [q.data, lookup]);

  const offlineCopy =
    q.isError && lookup && remembered?.snapshot && remembered.orderNumber === lookup.orderNumber
      ? remembered
      : null;
  const order = q.data ?? offlineCopy?.snapshot;
  // A failed refresh (offline) with a copy on screen: say how old the copy is.
  const savedAt =
    q.isError && q.error instanceof ApiError && q.error.code === "network"
      ? q.data
        ? new Date(q.dataUpdatedAt).toISOString()
        : offlineCopy?.savedAt
      : undefined;

  if (lookup && q.isPending) {
    return (
      <div className="flex flex-col gap-4" aria-busy="true" aria-label="Finding your order">
        <Skeleton className="h-40 rounded-card-lg" />
        <Skeleton className="h-64 rounded-card" />
      </div>
    );
  }

  if (lookup && order) {
    return (
      <div className="flex flex-col gap-4">
        <OrderResult order={order} lookup={lookup} offlineSavedAt={savedAt} />
        <Button
          variant="ghost"
          className="self-start"
          onClick={() => {
            setLookup(null);
          }}
        >
          <RotateCcw className="size-4" aria-hidden /> Track a different order
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {!online && (
        <p role="status" className="flex items-start gap-3 rounded-card bg-warning-soft p-4 text-sm">
          <WifiOff className="mt-0.5 size-5 shrink-0 text-warning" aria-hidden />
          <span>
            <strong className="font-semibold">You are offline.</strong> Connect to the internet to check your
            order.
            {remembered?.snapshot && " Track the same order again to see your last saved status."}
          </span>
        </p>
      )}
      <Card size="lg" className="max-w-xl">
        <OrderLookupForm
          key={prefill?.orderNumber ?? "empty"}
          defaultOrderNumber={prefill?.orderNumber ?? wanted ?? ""}
          defaultContact={prefill?.contact ?? ""}
          submitLabel="Track order"
          loading={q.isFetching}
          error={lookup && q.isError ? q.error.message : undefined}
          onSubmit={(l) => {
            // same lookup again after an error: the query key is unchanged, so refetch explicitly
            if (lookup && lookup.orderNumber === l.orderNumber && lookup.contact === l.contact)
              void q.refetch();
            else {
              setPrefill(l);
              setLookup(l);
            }
          }}
        />
      </Card>
    </div>
  );
}
