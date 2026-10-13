import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Container } from "@/components/layout/Container";
import { PolicyDocument } from "@/components/store/PolicyDocument";
import { Skeleton } from "@/components/ui/Skeleton";
import { loadPolicy, policySlugs } from "@/lib/policies";

export function generateStaticParams() {
  return policySlugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps<"/policies/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const policy = await loadPolicy(slug);
  if (!policy) return { title: "Page not found" };
  return {
    title: policy.title,
    description: policy.summary,
    // draft wording must not be indexed or quoted by search engines
    robots: policy.status === "draft" ? { index: false, follow: true } : undefined,
  };
}

export default function PolicyPage(props: PageProps<"/policies/[slug]">) {
  return (
    <Container className="max-w-3xl py-6 md:py-10">
      <Suspense fallback={<Skeleton className="h-96 rounded-card-lg" />}>
        <PolicyLoader params={props.params} />
      </Suspense>
    </Container>
  );
}

async function PolicyLoader({ params }: { params: PageProps<"/policies/[slug]">["params"] }) {
  const { slug } = await params;
  const policy = await loadPolicy(slug);
  if (!policy) notFound();
  return <PolicyDocument policy={policy} />;
}
