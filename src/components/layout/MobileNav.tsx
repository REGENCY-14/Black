"use client";

import { Menu, MessageCircle } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { whatsappLink } from "@/config";
import { mainNav } from "@/config/nav";

export function MobileNav() {
  const [open, setOpen] = useState(false);
  return (
    <div className="lg:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        aria-haspopup="dialog"
        className="inline-flex min-h-hit min-w-hit items-center justify-center rounded-btn border border-line bg-card text-fg transition-colors hover:bg-subtle"
      >
        <Menu className="size-5" aria-hidden />
      </button>
      <Sheet
        open={open}
        onOpenChange={setOpen}
        title="Menu"
        footer={
          <div className="flex items-center gap-3">
            <Button asChild variant="whatsapp" block="always" size="lg">
              <a href={whatsappLink()} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="size-5" aria-hidden />
                Chat on WhatsApp
              </a>
            </Button>
            <ThemeToggle />
          </div>
        }
      >
        <nav aria-label="Mobile">
          <ul className="flex flex-col">
            {mainNav.map((item) => (
              <li key={item.href} className="border-b border-line last:border-0">
                <Link
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="flex min-h-14 items-center text-lg font-medium"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </Sheet>
    </div>
  );
}
