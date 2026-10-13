"use client";

import { RoleGate } from "@/components/admin/AdminShell";
import { ProductForm } from "@/components/admin/ProductForm";

export default function AdminNewProductPage() {
  return (
    <RoleGate role="owner">
      <ProductForm />
    </RoleGate>
  );
}
