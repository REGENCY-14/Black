import { Suspense } from "react";
import { Container } from "@/components/layout/Container";
import {
  DeliveredGallery,
  HeroCard,
  HowItWorks,
  NextContainerTile,
  PreordersStrip,
  TrustPoints,
  UpdatesTile,
} from "@/components/store/HomeSections";
import { ProductGridSkeleton } from "@/components/store/ProductGrid";
import { Skeleton } from "@/components/ui/Skeleton";
import { brand, contact } from "@/config";
import { siteUrl } from "@/config/site";

const organization = {
  "@context": "https://schema.org",
  "@type": "Store",
  name: brand.name,
  url: siteUrl,
  description: brand.description,
  logo: `${siteUrl}/icons/icon-512.png`,
  areaServed: "GH",
  contactPoint: contact.phones.map((p) => ({
    "@type": "ContactPoint",
    telephone: p.e164,
    contactType: "customer service",
    availableLanguage: "en",
  })),
};

/** Home: a bento grid on desktop, one column of the same tiles on mobile. */
export default function Home() {
  return (
    <Container className="flex flex-col gap-10 py-6 md:py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organization).replace(/</g, "\\u003c") }}
      />
      <div className="grid gap-4 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <HeroCard />
        </div>
        <div className="lg:col-span-4">
          <Suspense fallback={<Skeleton className="h-56 rounded-card" />}>
            <NextContainerTile />
          </Suspense>
        </div>
      </div>

      <Suspense
        fallback={
          <div className="flex flex-col gap-4">
            <Skeleton className="h-7 w-48" />
            <ProductGridSkeleton count={4} />
          </div>
        }
      >
        <PreordersStrip />
      </Suspense>

      <div className="grid gap-4 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <HowItWorks />
        </div>
        <div className="lg:col-span-5">
          <UpdatesTile />
        </div>
      </div>

      <TrustPoints />
      <DeliveredGallery />
    </Container>
  );
}
