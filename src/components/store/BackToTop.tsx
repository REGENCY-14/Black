"use client";

import { ArrowUp } from "lucide-react";
import { useEffect, useState } from "react";

/** Round-cornered arrow that returns the visitor to the top of a long list. Appears after one screen of scrolling. */
export function BackToTop() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 600);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!show) return null;
  return (
    <button
      type="button"
      aria-label="Back to top"
      onClick={() => {
        const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
      }}
      // sits above the WhatsApp button (bottom right) and any sticky bottom bar
      className="fixed right-4 bottom-[calc(5rem+var(--sticky-bar,0px)+env(safe-area-inset-bottom))] z-20 inline-flex size-hit items-center justify-center rounded-btn border border-line bg-card text-fg shadow-float transition-transform active:scale-[0.96] md:right-6 md:bottom-24"
    >
      <ArrowUp className="size-5" aria-hidden />
    </button>
  );
}
