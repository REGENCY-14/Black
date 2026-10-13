import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/layout/Container";
import { DeliveredGallery, HowItWorks } from "@/components/store/HomeSections";
import { Button } from "@/components/ui/Button";
import { Card, Key } from "@/components/ui/Card";
import { brand } from "@/config";
import { about } from "@/config/about";

export const metadata: Metadata = {
  title: "About",
  description: `${brand.name} buys products from factories in China and delivers them to customers in Ghana. ${brand.tagline}`,
};

export default function AboutPage() {
  return (
    <Container className="flex flex-col gap-10 py-6 md:py-10">
      <section aria-labelledby="about-title" className="flex max-w-3xl flex-col gap-4">
        <h1 id="about-title" className="text-2xl font-medium text-fg-faint md:text-3xl">
          <Key>{about.headline}</Key>
        </h1>
        <p className="text-lg text-fg-secondary">{about.intro}</p>
        <div className="flex flex-wrap gap-3">
          <Button asChild size="lg" block="responsive">
            <Link href="/shop">
              Browse preorders <ArrowRight className="size-5" aria-hidden />
            </Link>
          </Button>
          <Button asChild size="lg" variant="secondary" block="responsive">
            <Link href="/contact">Contact us</Link>
          </Button>
        </div>
      </section>

      <section aria-labelledby="principles-title" className="flex flex-col gap-4">
        <h2 id="principles-title" className="text-xl font-semibold">
          How we work
        </h2>
        <ul className="grid gap-4 md:grid-cols-2">
          {about.principles.map((p) => (
            <li key={p.title}>
              <Card className="h-full">
                <h3 className="text-lg font-semibold">{p.title}</h3>
                <p className="mt-1 text-fg-secondary">{p.text}</p>
              </Card>
            </li>
          ))}
        </ul>
      </section>

      <HowItWorks />
      <DeliveredGallery />
    </Container>
  );
}
