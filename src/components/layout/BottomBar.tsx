"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/cn";

/**
 * Sticky bottom action bar for mobile (product "Preorder", checkout "Pay GH₵ …").
 * Pads for the home-indicator safe area and publishes its height as --sticky-bar
 * so floating elements (the WhatsApp pill) sit above it. Hidden from md up by default.
 */
export function BottomBar({
  children,
  className,
  showOnDesktop = false,
}: {
  children: React.ReactNode;
  className?: string;
  showOnDesktop?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const root = document.documentElement;
    const update = () => root.style.setProperty("--sticky-bar", `${el.offsetHeight}px`);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      ro.disconnect();
      root.style.removeProperty("--sticky-bar");
    };
  }, []);

  return (
    <div
      ref={ref}
      className={cn(
        "fixed inset-x-0 bottom-0 z-30 border-t border-line bg-card/95 px-(--page-gutter) pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-md",
        !showOnDesktop && "md:hidden",
        className,
      )}
    >
      {children}
    </div>
  );
}
