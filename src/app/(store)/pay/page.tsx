"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Container } from "@/components/layout/Container";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { PayView } from "@/components/store/PayView";
import { Skeleton } from "@/components/ui/Skeleton";

function PayFromParams() {
  const order = useSearchParams().get("order") ?? undefined;
  return (
    <QueryProvider>
      <PayView initialOrderNumber={order} />
    </QueryProvider>
  );
}

export default function PayPage() {
  return (
    <Container className="flex max-w-3xl flex-col gap-6 py-6 md:py-10">
      <div>
        <h1 className="text-2xl font-semibold md:text-3xl">Pay your balance</h1>
        <p className="mt-1 text-fg-secondary">
          Enter your order number to see what is left to pay and when it is due.
        </p>
      </div>
      <Suspense fallback={<Skeleton className="h-72 max-w-xl rounded-card-lg" />}>
        <PayFromParams />
      </Suspense>
    </Container>
  );
}
