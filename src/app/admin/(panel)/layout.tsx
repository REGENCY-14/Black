import { Suspense } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { Skeleton } from "@/components/ui/Skeleton";

export default function PanelLayout({ children }: { children: React.ReactNode }) {
  // the shell reads the pathname for the active menu item, which needs a Suspense boundary
  return (
    <Suspense
      fallback={
        <div className="container-page flex flex-col gap-4 py-8" aria-busy="true" aria-label="Loading admin">
          <Skeleton className="h-12 rounded-btn" />
          <Skeleton className="h-64 rounded-card" />
        </div>
      }
    >
      <AdminShell>{children}</AdminShell>
    </Suspense>
  );
}
