import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { OfflineNotice } from "@/components/layout/OfflineNotice";
import { InstallPrompt } from "@/components/layout/InstallPrompt";
import { WhatsAppFab } from "@/components/store/WhatsAppFab";

/** The storefront chrome (skip link, header, footer, WhatsApp pill). Shared by the store layout and the root 404. */
export function StoreFrame({ children }: { children: React.ReactNode }) {
  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-btn focus:bg-primary focus:px-4 focus:py-3 focus:text-primary-fg"
      >
        Skip to content
      </a>
      <Header />
      <OfflineNotice />
      <main id="main" tabIndex={-1} className="flex flex-1 flex-col outline-none">
        {children}
      </main>
      <InstallPrompt />
      <Footer />
      <WhatsAppFab />
    </>
  );
}
