"use client";

import { MessageCircle, Music2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { brand, whatsappLink } from "@/config";
import { mainNav } from "@/config/nav";

/** The mobile menu dialog. Loaded on demand (see MobileNav) because it pulls in Radix Dialog. */
export default function MenuSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
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
                onClick={() => onOpenChange(false)}
                className="flex min-h-14 items-center text-lg font-medium"
              >
                {item.label}
              </Link>
            </li>
          ))}
          <li className="border-b border-line last:border-0">
            <a
              href={brand.social.tiktok}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-14 items-center gap-2 text-lg font-medium"
            >
              <Music2 className="size-5" aria-hidden /> TikTok
            </a>
          </li>
        </ul>
      </nav>
    </Sheet>
  );
}
