"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Container } from "@/components/layout/Container";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { TrackView } from "@/components/store/TrackView";
import { Skeleton } from "@/components/ui/Skeleton";

function TrackFromParams() {
  const order = useSearchParams().get("order") ?? undefined;
  return (
    <QueryProvider>
      <TrackView initialOrderNumber={order} />
    </QueryProvider>
  );
}

export default function TrackPage() {
  return (
    <Container className="flex max-w-3xl flex-col gap-6 py-6 md:py-10">
      <div>
        <h1 className="text-2xl font-semibold md:text-3xl">Track your order</h1>
        <p className="mt-1 text-fg-secondary">
          Enter your order number and the phone or email you used to order.
        </p>
      </div>
      {/* useSearchParams needs a Suspense boundary so the shell can be prerendered */}
      <Suspense fallback={<Skeleton className="h-72 max-w-xl rounded-card-lg" />}>
        <TrackFromParams />
      </Suspense>
    </Container>
  );
}
