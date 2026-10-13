"use client";

import { RoleGate } from "@/components/admin/AdminShell";
import { StaffView } from "@/components/admin/StaffView";

export default function AdminStaffPage() {
  return (
    <RoleGate role="owner">
      <StaffView />
    </RoleGate>
  );
}
