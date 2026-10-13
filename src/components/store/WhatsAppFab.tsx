import { MessageCircle } from "lucide-react";
import { FloatingPill } from "@/components/ui/Tooltip";
import { whatsappLink } from "@/config";

/** Floating black pill (reference 2). Sits above any BottomBar via the --sticky-bar variable. */
export function WhatsAppFab() {
  return (
    <FloatingPill
      href={whatsappLink("Hi, I have a question about a preorder.")}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat on WhatsApp"
      className="fixed right-4 bottom-[calc(1rem+var(--sticky-bar,0px)+env(safe-area-inset-bottom))] z-20 md:right-6 md:bottom-6"
    >
      <MessageCircle className="size-5" aria-hidden />
      <span className="hidden sm:inline">Chat on WhatsApp</span>
    </FloatingPill>
  );
}
