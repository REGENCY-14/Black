"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { OrdersView } from "@/components/admin/OrdersView";
import { ListSkeleton } from "@/components/admin/states";

function OrdersFromParams() {
  const params = useSearchParams();
  // key remounts the view when a dashboard link changes the filters
  return (
    <OrdersView
      key={params.toString()}
      initialBalance={params.get("balance") === "1"}
      initialStatus={params.get("status") ?? "all"}
    />
  );
}

export default function AdminOrdersPage() {
  return (
    <Suspense fallback={<ListSkeleton />}>
      <OrdersFromParams />
    </Suspense>
  );
}
