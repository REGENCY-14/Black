import { Compass } from "lucide-react";
import Link from "next/link";
import { Container } from "@/components/layout/Container";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

/** Friendly 404: says what is missing and offers the three things people usually want next. */
export function NotFoundState() {
  return (
    <Container className="flex flex-1 items-center justify-center py-12">
      <Card size="lg" className="flex w-full max-w-lg flex-col items-start gap-4" data-testid="not-found">
        <span className="inline-flex size-12 items-center justify-center rounded-pill bg-subtle" aria-hidden>
          <Compass className="size-6 text-fg-secondary" />
        </span>
        <div>
          <h1 className="text-2xl font-semibold">We could not find that page</h1>
          <p className="mt-1 text-fg-secondary">
            The link may be old or mistyped. Browse what is open for preorder, or track an order you already
            placed.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button asChild size="lg" block="responsive">
            <Link href="/shop">Browse preorders</Link>
          </Button>
          <Button asChild size="lg" variant="secondary" block="responsive">
            <Link href="/track">Track an order</Link>
          </Button>
        </div>
      </Card>
    </Container>
  );
}
