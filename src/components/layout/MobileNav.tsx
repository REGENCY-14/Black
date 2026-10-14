"use client";

import { Menu } from "lucide-react";
import { useEffect, useState } from "react";
import { Lazy } from "@/components/layout/Lazy";

// The dialog (and Radix with it) is not part of the first load: it arrives on first use, or a moment
// after the page has settled, so tapping the menu button is still instant.
const loadMenu = () => import("./MenuSheet");

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const [wanted, setWanted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => void loadMenu(), 3000); // warm the cache once the page has settled
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        onClick={() => {
          setWanted(true);
          setOpen(true);
        }}
        onPointerEnter={() => void loadMenu()}
        aria-label="Open menu"
        aria-haspopup="dialog"
        className="inline-flex min-h-hit min-w-hit items-center justify-center rounded-btn border border-line bg-card text-fg transition-colors hover:bg-subtle"
      >
        <Menu className="size-5" aria-hidden />
      </button>
      <Lazy loader={loadMenu} enabled={wanted} props={{ open, onOpenChange: setOpen }} />
    </div>
  );
}
