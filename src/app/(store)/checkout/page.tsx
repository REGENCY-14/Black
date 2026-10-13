import type { Metadata } from "next";
import { Container } from "@/components/layout/Container";
import { CheckoutView } from "@/components/store/CheckoutView";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };

export default function CheckoutPage() {
  return (
    <Container className="flex flex-col gap-6 py-6 pb-32 md:py-10 lg:pb-10">
      <h1 className="text-2xl font-semibold md:text-3xl">Checkout</h1>
      <CheckoutView />
    </Container>
  );
}
