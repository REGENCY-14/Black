import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/layout/Container";
import { Card } from "@/components/ui/Card";
import { loadPolicy, policySlugs } from "@/lib/policies";

export const metadata: Metadata = { title: "Policies", robots: { index: false, follow: true } };

export default async function PoliciesPage() {
  const policies = (await Promise.all(policySlugs.map((s) => loadPolicy(s)))).filter((p) => p !== null);
  return (
    <Container className="max-w-3xl py-6 md:py-10">
      <h1 className="text-2xl font-semibold md:text-3xl">Policies</h1>
      <ul className="mt-6 flex flex-col gap-3">
        {policies.map((p) => (
          <li key={p.slug}>
            <Card as="div" className="p-0">
              <Link href={`/policies/${p.slug}`} className="flex min-h-hit flex-col gap-1 rounded-card p-5">
                <span className="text-lg font-semibold">{p.title}</span>
                <span className="text-fg-secondary">{p.summary}</span>
              </Link>
            </Card>
          </li>
        ))}
      </ul>
    </Container>
  );
}
