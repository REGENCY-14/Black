import { Suspense } from "react";
import { RoleGate } from "@/components/admin/AdminShell";
import { ProductForm } from "@/components/admin/ProductForm";
import { ListSkeleton } from "@/components/admin/states";

export default function AdminEditProductPage(props: PageProps<"/admin/products/[id]">) {
  return (
    <Suspense fallback={<ListSkeleton rows={2} />}>
      <EditLoader params={props.params} />
    </Suspense>
  );
}

async function EditLoader({ params }: { params: PageProps<"/admin/products/[id]">["params"] }) {
  const { id } = await params;
  return (
    <RoleGate role="owner">
      <ProductForm id={id} />
    </RoleGate>
  );
}
