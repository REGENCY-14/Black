"use client";

import { RoleGate } from "@/components/admin/AdminShell";
import { CategoriesView } from "@/components/admin/CategoriesView";

export default function AdminCategoriesPage() {
  return (
    <RoleGate role="owner">
      <CategoriesView />
    </RoleGate>
  );
}
