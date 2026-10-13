"use client";

import { RoleGate } from "@/components/admin/AdminShell";
import { ProductsView } from "@/components/admin/ProductsView";

export default function AdminProductsPage() {
  return (
    <RoleGate role="owner">
      <ProductsView />
    </RoleGate>
  );
}
