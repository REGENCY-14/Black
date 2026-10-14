import type { Metadata } from "next";
import { Container } from "@/components/layout/Container";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { CartView } from "@/components/store/CartView";

export const metadata: Metadata = { title: "Your cart", robots: { index: false } };

export default function CartPage() {
  return (
    <Container className="flex flex-col gap-6 py-6 pb-32 md:py-10 md:pb-10">
      <h1 className="text-2xl font-semibold md:text-3xl">Your cart</h1>
      <QueryProvider>
        <CartView />
      </QueryProvider>
    </Container>
  );
}
