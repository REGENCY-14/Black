import { WifiOff } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/layout/Container";
import { RetryButton } from "@/components/layout/RetryButton";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export const metadata: Metadata = { title: "You are offline", robots: { index: false } };

/** Shown by the service worker when a page that was never opened before is requested with no connection. */
export default function OfflinePage() {
  return (
    <Container className="flex flex-1 items-center justify-center py-12">
      <Card size="lg" className="flex w-full max-w-lg flex-col items-start gap-4" data-testid="offline-page">
        <span
          className="inline-flex size-12 items-center justify-center rounded-pill bg-warning-soft"
          aria-hidden
        >
          <WifiOff className="size-6 text-warning" />
        </span>
        <div>
          <h1 className="text-2xl font-semibold">You are offline</h1>
          <p className="mt-1 text-fg-secondary">
            This page needs a connection. Pages you have opened before still work, and the tracking page shows
            the last status it saved. Placing an order or paying needs the internet.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <RetryButton />
          <Button asChild size="lg" variant="secondary" block="responsive">
            <Link href="/track">Open tracking</Link>
          </Button>
        </div>
      </Card>
    </Container>
  );
}
