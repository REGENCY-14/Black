import { FileWarning } from "lucide-react";
import Link from "next/link";
import Markdown, { type Components } from "react-markdown";
import { formatDate } from "@/lib/dates";
import type { Policy } from "@/lib/policies";

/**
 * Links may be web, mail, phone, in-site or in-page only. Anything else (for example javascript:)
 * is dropped. react-markdown's own default would also drop tel: links, which the contact lines need.
 */
export const allowedUrl = (url: string) => (/^(https?:|mailto:|tel:|\/|#)/i.test(url) ? url : "");

/** Markdown elements styled with design tokens (no raw HTML is rendered from the files). */
const components: Components = {
  h2: (p) => <h2 className="mt-8 mb-2 text-xl font-semibold first:mt-0" {...p} />,
  h3: (p) => <h3 className="mt-6 mb-1 text-lg font-semibold" {...p} />,
  p: (p) => <p className="my-3 max-w-prose text-fg-secondary" {...p} />,
  ul: (p) => (
    <ul className="my-3 flex max-w-prose list-disc flex-col gap-1.5 pl-5 text-fg-secondary" {...p} />
  ),
  ol: (p) => (
    <ol className="my-3 flex max-w-prose list-decimal flex-col gap-1.5 pl-5 text-fg-secondary" {...p} />
  ),
  strong: (p) => <strong className="font-semibold text-fg" {...p} />,
  blockquote: (p) => (
    <blockquote
      className="my-4 max-w-prose rounded-card border-l-4 border-warning bg-warning-soft p-4 text-fg [&>p]:my-0 [&>p]:text-fg"
      {...p}
    />
  ),
  a: ({ href = "", children }) =>
    href.startsWith("/") ? (
      <Link href={href} className="font-medium text-fg underline underline-offset-2">
        {children}
      </Link>
    ) : (
      <a
        href={href}
        className="font-medium text-fg underline underline-offset-2"
        {...(href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      >
        {children}
      </a>
    ),
};

/** Banner shown on every draft policy, so nobody mistakes placeholder wording for approved terms. */
export function DraftBanner({ updated }: { updated?: string }) {
  return (
    <div
      role="note"
      className="flex items-start gap-3 rounded-card bg-warning-soft p-4 text-sm"
      data-testid="draft-banner"
    >
      <FileWarning className="mt-0.5 size-5 shrink-0 text-warning" aria-hidden />
      <p>
        <strong className="font-semibold text-warning">Draft.</strong> This page is placeholder wording and
        has not been approved by the store owner yet. Parts marked “To confirm” are still undecided.
        {updated && (
          <span className="text-fg-muted"> Last updated {formatDate(`${updated}T00:00:00Z`)}.</span>
        )}
      </p>
    </div>
  );
}

export function PolicyDocument({ policy }: { policy: Policy }) {
  return (
    <article className="flex flex-col gap-4" aria-labelledby="policy-title">
      <header className="flex flex-col gap-2">
        <h1 id="policy-title" className="text-2xl font-semibold md:text-3xl">
          {policy.title}
        </h1>
        {policy.summary && <p className="text-fg-secondary">{policy.summary}</p>}
      </header>
      {policy.status === "draft" && <DraftBanner updated={policy.updated} />}
      <div>
        <Markdown components={components} urlTransform={allowedUrl}>
          {policy.body}
        </Markdown>
      </div>
    </article>
  );
}
