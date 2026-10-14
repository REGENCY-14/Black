import type { Metadata } from "next";
import { AppProviders } from "@/components/providers/AppProviders";

// The admin area is private: never indexed, never linked from the storefront.
export const metadata: Metadata = {
  title: { default: "Admin", template: "%s | Admin" },
  robots: { index: false, follow: false },
};

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppProviders>
      <div className="flex min-h-dvh flex-col">{children}</div>
    </AppProviders>
  );
}
