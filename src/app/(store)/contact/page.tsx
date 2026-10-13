import { Mail, MessageCircle, Music2, Phone } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/layout/Container";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { brand, contact, whatsappLink } from "@/config";

export const metadata: Metadata = {
  title: "Contact",
  description: `Message ${brand.name} on WhatsApp, call us, or find us on TikTok.`,
};

export default function ContactPage() {
  return (
    <Container className="flex max-w-3xl flex-col gap-6 py-6 md:py-10">
      <div>
        <h1 className="text-2xl font-semibold md:text-3xl">Contact us</h1>
        <p className="mt-1 text-fg-secondary">
          WhatsApp is the fastest way to reach us. Have your order number ready.
        </p>
      </div>

      <Card size="lg" as="section" aria-labelledby="whatsapp-title" className="flex flex-col gap-3">
        <h2 id="whatsapp-title" className="text-lg font-semibold">
          Message us on WhatsApp
        </h2>
        <p className="text-fg-secondary">Ask about a product, an order, or a payment.</p>
        <Button asChild variant="whatsapp" size="lg" block="responsive" className="self-start">
          <a href={whatsappLink("Hi, I have a question.")} target="_blank" rel="noopener noreferrer">
            <MessageCircle className="size-5" aria-hidden /> Chat on WhatsApp
          </a>
        </Button>
      </Card>

      <Card as="section" aria-labelledby="phones-title" className="flex flex-col gap-3">
        <h2 id="phones-title" className="text-lg font-semibold">
          Call us
        </h2>
        <ul className="flex flex-col divide-y divide-line">
          {contact.phones.map((p) => (
            <li key={p.e164}>
              <a href={`tel:${p.e164}`} className="flex min-h-14 items-center gap-3 py-2">
                <span
                  className="inline-flex size-10 shrink-0 items-center justify-center rounded-pill bg-subtle"
                  aria-hidden
                >
                  <Phone className="size-4" />
                </span>
                <span>
                  <span className="block font-medium">{p.display}</span>
                  <span className="block text-sm text-fg-muted">{p.label}</span>
                </span>
              </a>
            </li>
          ))}
        </ul>
      </Card>

      {/* email stays hidden until the owner supplies one in config/contact.ts */}
      {contact.email && (
        <Card as="section" aria-labelledby="email-title" className="flex flex-col gap-3">
          <h2 id="email-title" className="text-lg font-semibold">
            Email
          </h2>
          <a
            href={`mailto:${contact.email}`}
            className="inline-flex min-h-hit items-center gap-3 font-medium"
          >
            <Mail className="size-5" aria-hidden /> {contact.email}
          </a>
        </Card>
      )}

      <Card as="section" aria-labelledby="social-title" className="flex flex-col gap-3">
        <h2 id="social-title" className="text-lg font-semibold">
          Follow us
        </h2>
        <p className="text-fg-secondary">See new products and delivered orders on TikTok.</p>
        <Button asChild variant="secondary" className="self-start">
          <a href={brand.social.tiktok} target="_blank" rel="noopener noreferrer">
            <Music2 className="size-4" aria-hidden /> TikTok
          </a>
        </Button>
      </Card>

      <p className="text-sm text-fg-muted">
        Track an order on the{" "}
        <Link href="/track" className="font-medium underline">
          tracking page
        </Link>
        , or pay a balance on the{" "}
        <Link href="/pay" className="font-medium underline">
          payment page
        </Link>
        .
      </p>
    </Container>
  );
}
