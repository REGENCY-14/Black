import { Suspense } from "react";
import { OrderDetailView } from "@/components/admin/OrderDetailView";
import { ListSkeleton } from "@/components/admin/states";

export default function AdminOrderPage(props: PageProps<"/admin/orders/[id]">) {
  return (
    <Suspense fallback={<ListSkeleton rows={3} />}>
      <OrderLoader params={props.params} />
    </Suspense>
  );
}

async function OrderLoader({ params }: { params: PageProps<"/admin/orders/[id]">["params"] }) {
  const { id } = await params;
  return <OrderDetailView id={id} />;
}
