"use client";

import { MessageCircle, Music2, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Wordmark } from "@/components/brand/Wordmark";
import { MobileNav } from "@/components/layout/MobileNav";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { mainNav } from "@/config/nav";
import { useCartLines } from "@/hooks/useHydrated";
import clsx from "clsx";
import { cartCount } from "@/stores/cart";
import { brand, whatsappLink } from "@/config";

function CartLink() {
  const { lines } = useCartLines();
  const count = cartCount(lines);
  return (
    <Link
      href="/cart"
      aria-label={count ? `Cart, ${count} ${count === 1 ? "item" : "items"}` : "Cart, empty"}
      className="relative inline-flex min-h-hit min-w-hit items-center justify-center rounded-btn border border-line bg-card text-fg transition-colors hover:bg-subtle"
    >
      <ShoppingBag className="size-5" aria-hidden />
      {count > 0 && (
        <span
          aria-hidden
          className="absolute -top-1.5 -right-1.5 inline-flex min-w-5 items-center justify-center rounded-pill bg-accent px-1.5 text-xs leading-5 font-semibold text-white"
        >
          {count}
        </span>
      )}
    </Link>
  );
}

export function Header() {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-page/85 backdrop-blur-md">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Link
          href="/"
          aria-label="Home"
          className="-ml-1 inline-flex min-h-hit items-center rounded-btn px-1"
        >
          <Wordmark />
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-1 lg:flex">
          {mainNav.map((item) => {
            const active = !item.href.includes("#") && pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={clsx(
                  "inline-flex min-h-hit items-center rounded-pill px-4 text-sm font-medium text-fg-secondary transition-colors hover:bg-subtle hover:text-fg",
                  active && "bg-card text-fg shadow-card",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-2 lg:flex">
            <a
              href={whatsappLink()}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="WhatsApp"
              className="inline-flex min-h-hit min-w-hit items-center justify-center rounded-btn border border-line bg-card text-fg transition-colors hover:bg-subtle"
            >
              <MessageCircle className="size-5" aria-hidden />
            </a>
            <a
              href={brand.social.tiktok}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="TikTok"
              className="inline-flex min-h-hit min-w-hit items-center justify-center rounded-btn border border-line bg-card text-fg transition-colors hover:bg-subtle"
            >
              <Music2 className="size-5" aria-hidden />
            </a>
            <ThemeToggle />
          </div>
          <CartLink />
          <MobileNav />
        </div>
      </div>
    </header>
  );
}
