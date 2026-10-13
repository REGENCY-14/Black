import type { Metadata } from "next";
import { Container } from "@/components/layout/Container";
import { ConfirmationView } from "@/components/store/ConfirmationView";

export const metadata: Metadata = { title: "Order confirmed", robots: { index: false } };

export default function SuccessPage() {
  return (
    <Container className="py-6 md:py-10">
      <ConfirmationView />
    </Container>
  );
}
