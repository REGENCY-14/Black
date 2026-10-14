import { MessageCircle, Music2, Phone } from "lucide-react";
import Link from "next/link";
import { Wordmark } from "@/components/brand/Wordmark";
import { Container } from "@/components/layout/Container";
import { CurrentYear } from "@/components/layout/CurrentYear";
import { brand, contact } from "@/config";
import { helpNav, policyNav } from "@/config/nav";

function LinkList({ title, links }: { title: string; links: readonly { href: string; label: string }[] }) {
  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold">{title}</h2>
      <ul className="flex flex-col gap-1">
        {links.map((l) => (
          <li key={l.href}>
            <Link
              href={l.href}
              className="inline-flex min-h-hit items-center text-sm text-fg-secondary hover:text-fg"
            >
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

const linkClass = "inline-flex min-h-hit items-center gap-2 text-sm text-fg-secondary hover:text-fg";

export function Footer() {
  return (
    <footer className="mt-16 border-t border-line bg-card">
      <Container className="grid gap-10 py-12 md:grid-cols-2 lg:grid-cols-4">
        <div className="flex flex-col gap-4">
          <Wordmark />
          <p className="max-w-xs text-sm text-fg-secondary">{brand.tagline}</p>
          <ul className="flex flex-col">
            <li>
              <a href={contact.whatsapp} target="_blank" rel="noopener noreferrer" className={linkClass}>
                <MessageCircle className="size-4" aria-hidden /> WhatsApp
              </a>
            </li>
            <li>
              <a href={brand.social.tiktok} target="_blank" rel="noopener noreferrer" className={linkClass}>
                <Music2 className="size-4" aria-hidden /> TikTok
              </a>
            </li>
          </ul>
        </div>

        <LinkList title="Help" links={helpNav} />
        <LinkList title="Policies" links={policyNav} />

        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold">Contact</h2>
          <ul className="flex flex-col">
            {contact.phones.map((p) => (
              <li key={p.e164}>
                <a href={`tel:${p.e164}`} className={linkClass}>
                  <Phone className="size-4" aria-hidden />
                  <span>
                    {p.display} <span className="text-fg-muted">({p.label})</span>
                  </span>
                </a>
              </li>
            ))}
            {contact.email && (
              <li>
                <a href={`mailto:${contact.email}`} className={linkClass}>
                  {contact.email}
                </a>
              </li>
            )}
          </ul>
        </div>
      </Container>
      <div className="border-t border-line">
        <Container className="flex flex-col gap-1 py-5 text-sm text-fg-muted sm:flex-row sm:justify-between">
          <p>
            © <CurrentYear /> {brand.name}. All prices in Ghana cedis.
          </p>
          <p>
            Prices include shipping from China and duty.{" "}
            <Link href="/credits" className="inline-flex min-h-hit items-center underline underline-offset-2">
              Photo credits
            </Link>
          </p>
        </Container>
      </div>
    </footer>
  );
}
