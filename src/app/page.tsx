import Link from "next/link";
import { Wordmark } from "@/components/brand/Wordmark";
import { brand } from "@/config";

/** Placeholder until Phase 3 builds the real home page. */
export default function Home() {
  return (
    <main className="container-page flex flex-1 flex-col items-start justify-center gap-4 py-16">
      <Wordmark />
      <p className="text-fg-muted">{brand.tagline}</p>
      <Link href="/_design" className="min-h-hit rounded-btn bg-primary px-5 py-3 text-primary-fg">
        Design tokens
      </Link>
    </main>
  );
}
