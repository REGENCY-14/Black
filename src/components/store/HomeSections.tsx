import {
  ArrowRight,
  BadgeCheck,
  Camera,
  MapPin,
  MessageCircle,
  Music2,
  PackageCheck,
  Ship,
  Wallet,
} from "lucide-react";
import { cacheLife } from "next/cache";
import Link from "next/link";
import { ProductCarousel } from "@/components/store/ProductGrid";
import { AvatarStack } from "@/components/ui/AvatarStack";
import { Button } from "@/components/ui/Button";
import { Card, CardMedia, Key } from "@/components/ui/Card";
import { SmartImage } from "@/components/ui/SmartImage";
import { brand, businessRules, contact, whatsappLink } from "@/config";
import { images } from "@/config/images";
import { deliveredPhotos } from "@/config/trust";
import { getBatches, getProducts } from "@/lib/catalog";
import { dateTileParts, formatArrivalWindow, relativeDays } from "@/lib/dates";

const tileTitle = "text-lg font-semibold";

/** Hero card in the reference-1 style: deep teal media, nested radius, two-tone headline. */
export function HeroCard() {
  return (
    <Card size="lg" as="section" className="flex h-full flex-col gap-5" aria-labelledby="hero-title">
      <CardMedia ratio="aspect-[16/10]" className="bg-hero">
        {/* plain <img>: the two pre-sized files let a phone download ~30 KB instead of ~90 KB (LCP) */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={images.hero.replace(".jpg", "-1200.jpg")}
          srcSet={`${images.hero.replace(".jpg", "-640.jpg")} 640w, ${images.hero.replace(".jpg", "-1200.jpg")} 1200w`}
          sizes="(min-width: 1024px) 60vw, 100vw"
          width={1200}
          height={750}
          alt="A container ship carrying goods from China at dusk"
          fetchPriority="high"
          decoding="async"
          className="absolute inset-0 size-full object-cover"
        />
      </CardMedia>
      <div className="flex flex-1 flex-col gap-5 px-1 pb-1 md:px-2">
        <h1 id="hero-title" className="text-2xl font-medium text-fg-faint md:text-3xl">
          Preorder from China, <Key>pay {businessRules.deposit.percent}% now</Key>, and{" "}
          <Key>track it to your door</Key>.
        </h1>
        <div className="mt-auto">
          <Button asChild size="lg" block="responsive">
            <Link href="/shop">
              Browse preorders <ArrowRight className="size-5" aria-hidden />
            </Link>
          </Button>
        </div>
      </div>
    </Card>
  );
}

/** Date tile (reference 2): big day number, small label, plus who has preordered. */
export async function NextContainerTile() {
  "use cache";
  cacheLife("hours");
  const [batches, { items }] = await Promise.all([getBatches(), getProducts({ limit: 100 })]);
  const next = batches
    .filter((b) => b.status !== "arrived_in_ghana")
    .sort((a, b) => a.expectedArrival.localeCompare(b.expectedArrival))[0];
  if (!next) return null;
  const { day, month } = dateTileParts(next.expectedArrival);
  const ordered = items.filter((p) => p.batchId === next.id).reduce((n, p) => n + p.ordered, 0);

  return (
    <Card as="section" className="flex h-full flex-col gap-6" aria-labelledby="next-container">
      <div className="flex flex-col gap-1">
        <h2 id="next-container" className="text-sm text-fg-muted">
          Next container arrives
        </h2>
        <p className="flex items-baseline gap-2">
          <span className="text-3xl font-semibold tabular-nums">{day}</span>
          <span className="text-xl font-medium text-fg-faint">{month}</span>
        </p>
        <p className="text-sm text-fg-muted">
          {relativeDays(next.expectedArrival)} · delivery {formatArrivalWindow(next.expectedArrival)}
        </p>
      </div>
      <div className="mt-auto flex items-center gap-3">
        <AvatarStack
          people={[
            { name: "Ama Mensah" },
            { name: "Kojo Boateng" },
            { name: "Efua Owusu" },
            { name: "Yaw Darko" },
          ]}
          total={ordered}
        />
        <p className="text-sm text-fg-secondary">preordered</p>
      </div>
    </Card>
  );
}

export async function PreordersStrip() {
  const [{ items }, batches] = await Promise.all([getProducts({ sort: "popular", limit: 8 }), getBatches()]);
  return (
    <section aria-labelledby="open-now" className="flex flex-col gap-4">
      <div className="flex items-end justify-between gap-4">
        <h2 id="open-now" className="text-xl font-semibold">
          Preorders open now
        </h2>
        <Link
          href="/shop"
          className="inline-flex min-h-hit items-center gap-1 text-sm font-medium text-fg-secondary hover:text-fg"
        >
          See all <ArrowRight className="size-4" aria-hidden />
        </Link>
      </div>
      <p className="-mt-2 flex items-center gap-1 text-sm text-fg-muted md:hidden">
        Swipe to see more <ArrowRight className="size-4" aria-hidden />
      </p>
      <ProductCarousel products={items} batches={batches} label="Preorders open now, scroll sideways" />
    </section>
  );
}

const steps = [
  { icon: Wallet, title: "Preorder", text: `Pay ${businessRules.deposit.percent}% now to lock your price.` },
  { icon: Ship, title: "We ship from China", text: "We buy, ship and update you on WhatsApp at every step." },
  {
    icon: PackageCheck,
    title: "Pay the balance, receive",
    text: `Pay the rest ${businessRules.balance.dueDaysBeforeArrival} days before the container lands, then arrange delivery with the rider.`,
  },
];

export function HowItWorks() {
  return (
    <Card as="section" id="how-it-works" className="h-full scroll-mt-24" aria-labelledby="how-title">
      <h2 id="how-title" className={tileTitle}>
        How it works
      </h2>
      <ol className="mt-4 flex flex-col gap-4">
        {steps.map((s, i) => (
          <li key={s.title} className="flex items-start gap-4">
            <span
              className="inline-flex size-11 shrink-0 items-center justify-center rounded-pill bg-subtle text-fg"
              aria-hidden
            >
              <s.icon className="size-5" />
            </span>
            <div>
              <h3 className="font-semibold">
                {i + 1}. {s.title}
              </h3>
              <p className="text-sm text-fg-secondary">{s.text}</p>
            </div>
          </li>
        ))}
      </ol>
    </Card>
  );
}

const updates = [
  { title: "Order confirmed", sub: "We have your deposit." },
  { title: "Shipped from China", sub: "Your goods are on the water." },
  { title: "Arrived in Ghana", sub: "Balance paid? We are on our way." },
];

/** List-row tile (reference 2) showing the WhatsApp updates customers receive. */
export function UpdatesTile() {
  return (
    <Card as="section" className="flex h-full flex-col gap-4" aria-labelledby="updates-title">
      <div>
        <h2 id="updates-title" className={tileTitle}>
          Order updates on WhatsApp
        </h2>
        <p className="text-sm text-fg-secondary">Every status change lands in your chat. No refreshing.</p>
      </div>
      <ul className="flex flex-col divide-y divide-line">
        {updates.map((u) => (
          <li key={u.title} className="flex items-center gap-3 py-3 first:pt-0">
            <span
              className="inline-flex size-10 shrink-0 items-center justify-center rounded-pill bg-inverse text-fg-inverse"
              aria-hidden
            >
              <MessageCircle className="size-4" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-medium">{u.title}</p>
              <p className="truncate text-sm text-fg-muted">{u.sub}</p>
            </div>
          </li>
        ))}
      </ul>
      <div className="mt-auto flex flex-wrap gap-2">
        <Button asChild variant="whatsapp" size="sm">
          <a href={whatsappLink()} target="_blank" rel="noopener noreferrer">
            <MessageCircle className="size-4" aria-hidden /> WhatsApp
          </a>
        </Button>
        <Button asChild variant="secondary" size="sm">
          <a href={brand.social.tiktok} target="_blank" rel="noopener noreferrer">
            <Music2 className="size-4" aria-hidden /> TikTok
          </a>
        </Button>
        <Button asChild variant="ghost" size="sm">
          <Link href="/track">
            <MapPin className="size-4" aria-hidden /> Track an order
          </Link>
        </Button>
      </div>
      <p className="sr-only">Contact numbers: {contact.phones.map((p) => p.display).join(", ")}</p>
    </Card>
  );
}

const trust = [
  {
    icon: BadgeCheck,
    title: "One price, no surprises",
    text: "Prices include shipping from China and duty.",
  },
  { icon: Camera, title: "See real deliveries", text: "Photos of orders we have delivered to customers." },
  { icon: MapPin, title: "Track any order", text: "Enter your order number to see where it is." },
];

export function TrustPoints() {
  return (
    <ul className="grid gap-3 md:grid-cols-3">
      {trust.map((t) => (
        <li key={t.title} className="flex items-start gap-3 rounded-card bg-subtle p-4">
          <t.icon className="mt-0.5 size-5 shrink-0 text-fg-secondary" aria-hidden />
          <div>
            <p className="text-sm font-semibold">{t.title}</p>
            <p className="text-sm text-fg-secondary">{t.text}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function DeliveredGallery() {
  return (
    <section aria-labelledby="delivered-title" className="flex flex-col gap-4">
      <div>
        <h2 id="delivered-title" className="text-xl font-semibold">
          Delivered orders
        </h2>
        <p className="text-sm text-fg-secondary">Real photos from customers who have received their goods.</p>
      </div>
      <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-6">
        {deliveredPhotos.map((p) => (
          <li
            key={p.src}
            className="relative aspect-square overflow-hidden rounded-card bg-subtle shadow-card"
          >
            <SmartImage
              src={p.src}
              alt={p.alt}
              sizes="(min-width: 1024px) 16vw, (min-width: 768px) 30vw, 46vw"
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
