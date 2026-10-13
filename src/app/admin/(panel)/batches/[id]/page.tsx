import { Suspense } from "react";
import { BatchDetailView } from "@/components/admin/BatchesView";
import { ListSkeleton } from "@/components/admin/states";

export default function AdminBatchPage(props: PageProps<"/admin/batches/[id]">) {
  return (
    <Suspense fallback={<ListSkeleton rows={3} />}>
      <BatchLoader params={props.params} />
    </Suspense>
  );
}

async function BatchLoader({ params }: { params: PageProps<"/admin/batches/[id]">["params"] }) {
  const { id } = await params;
  return <BatchDetailView id={id} />;
}
