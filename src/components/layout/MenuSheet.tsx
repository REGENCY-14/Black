"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { MessageCircle, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Wordmark } from "@/components/brand/Wordmark";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { brand, contact, whatsappLink } from "@/config";
import { mainNav } from "@/config/nav";

const small = "inline-flex min-h-hit items-center text-sm uppercase tracking-wide";

/**
 * The mobile menu: a full-screen dark page (not a sheet) with large links, the contact lines and the
 * legal row at the bottom. Loaded on demand (see MobileNav) because it pulls in Radix Dialog.
 */
export default function MenuSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const pathname = usePathname();
  const close = () => onOpenChange(false);
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Content
          className="fixed inset-0 z-50 flex flex-col overflow-y-auto bg-page px-(--page-gutter) pt-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] text-fg outline-none data-[state=open]:animate-[fade-in_180ms_ease-out]"
          aria-describedby={undefined}
        >
          <Dialog.Title className="sr-only">Menu</Dialog.Title>

          <div className="flex h-12 items-center justify-between">
            <Link href="/" onClick={close} className="inline-flex min-h-hit items-center">
              <Wordmark className="uppercase" />
            </Link>
            <Dialog.Close
              aria-label="Close menu"
              className="inline-flex size-hit items-center justify-center rounded-pill bg-fg text-page transition-transform active:scale-[0.96]"
            >
              <X className="size-5" aria-hidden />
            </Dialog.Close>
          </div>

          <nav aria-label="Mobile" className="mt-12">
            <ul className="flex flex-col">
              {mainNav.map((item) => {
                const active = !item.href.includes("#") && pathname.startsWith(item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={close}
                      aria-current={active ? "page" : undefined}
                      className="flex min-h-16 items-center text-3xl tracking-tight aria-[current=page]:underline aria-[current=page]:underline-offset-8"
                    >
                      {item.label}
                    </Link>
                  </li>
                );
              })}
              <li>
                <a
                  href={brand.social.tiktok}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex min-h-16 items-center text-3xl tracking-tight"
                >
                  TikTok
                </a>
              </li>
            </ul>
          </nav>

          <div className="mt-auto flex flex-col gap-1 pt-12">
            {contact.phones.map((p) => (
              <a key={p.e164} href={`tel:${p.e164}`} className={small}>
                {p.label} {p.display}
              </a>
            ))}
            <div className="flex items-center justify-between gap-4">
              <a
                href={whatsappLink()}
                target="_blank"
                rel="noopener noreferrer"
                className={`${small} w-fit gap-2 border-b border-fg-inverse`}
              >
                <MessageCircle className="size-4" aria-hidden /> Chat on WhatsApp
              </a>
              <ThemeToggle />
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between gap-4 border-t border-line pt-2 text-fg-secondary">
            <div className="flex gap-4">
              <Link href="/policies/terms" onClick={close} className={`${small} text-xs`}>
                Terms
              </Link>
              <Link href="/policies/privacy" onClick={close} className={`${small} text-xs`}>
                Privacy
              </Link>
            </div>
            <p className="text-xs uppercase">
              &copy; {new Date().getFullYear()} {brand.name}
            </p>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
