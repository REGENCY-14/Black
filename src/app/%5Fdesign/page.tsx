import type { Metadata } from "next";
import { Wordmark } from "@/components/brand/Wordmark";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

export const metadata: Metadata = { title: "Design tokens", robots: { index: false } };

const swatches: { group: string; items: { name: string; cls: string }[] }[] = [
  {
    group: "Surfaces",
    items: [
      { name: "page", cls: "bg-page" },
      { name: "card", cls: "bg-card" },
      { name: "subtle", cls: "bg-subtle" },
      { name: "inverse", cls: "bg-inverse" },
      { name: "hero", cls: "bg-hero" },
    ],
  },
  {
    group: "Actions",
    items: [
      { name: "primary", cls: "bg-primary" },
      { name: "accent", cls: "bg-accent" },
      { name: "accent-soft", cls: "bg-accent-soft" },
      { name: "whatsapp", cls: "bg-whatsapp" },
    ],
  },
  {
    group: "Status",
    items: [
      { name: "success", cls: "bg-success" },
      { name: "success-soft", cls: "bg-success-soft" },
      { name: "warning", cls: "bg-warning" },
      { name: "warning-soft", cls: "bg-warning-soft" },
      { name: "danger", cls: "bg-danger" },
      { name: "danger-soft", cls: "bg-danger-soft" },
    ],
  },
];

const typeScale = [
  { cls: "text-xs", label: "text-xs" },
  { cls: "text-sm", label: "text-sm" },
  { cls: "text-base", label: "text-base" },
  { cls: "text-lg", label: "text-lg" },
  { cls: "text-xl", label: "text-xl" },
  { cls: "text-2xl", label: "text-2xl" },
  { cls: "text-3xl", label: "text-3xl" },
];

const radii = [
  { cls: "rounded-btn", label: "btn / input 16" },
  { cls: "rounded-card", label: "card 24" },
  { cls: "rounded-card-lg", label: "card-lg 32" },
  { cls: "rounded-pill", label: "pill" },
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4" aria-labelledby={title}>
      <h2 id={title} className="text-xl font-semibold">
        {title}
      </h2>
      {children}
    </section>
  );
}

export default function DesignPage() {
  return (
    <main className="container-page flex flex-col gap-10 py-8 md:py-12">
      <header className="flex items-center justify-between gap-4">
        <Wordmark />
        <ThemeToggle />
      </header>

      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold">
          <span className="text-fg-faint">Design tokens, </span>
          <span>one place to change them.</span>
        </h1>
        <p className="max-w-prose text-fg-muted">
          Every value on this page comes from <code>src/styles/tokens.css</code>. Toggle the theme to check
          light and dark.
        </p>
      </div>

      <Section title="Hero card (reference 1)">
        <article className="mx-auto w-full max-w-sm rounded-card-lg bg-card p-(--card-pad) shadow-card">
          <div
            className="aspect-[16/10] rounded-media bg-hero"
            role="img"
            aria-label="Placeholder hero image"
          />
          <div className="px-1 pt-4 pb-2">
            <p className="text-sm font-semibold text-fg-faint">Card 1</p>
            <p className="text-xl font-medium text-fg-faint">
              Preorder your <strong className="font-semibold text-fg">favourites</strong>, pay{" "}
              <strong className="font-semibold text-fg">70% now</strong>.
            </p>
          </div>
        </article>
      </Section>

      <Section title="Colour">
        <div className="flex flex-col gap-5">
          {swatches.map((g) => (
            <div key={g.group} className="flex flex-col gap-2">
              <h3 className="text-sm font-semibold text-fg-muted">{g.group}</h3>
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                {g.items.map((s) => (
                  <li key={s.name} className="flex flex-col gap-2 rounded-card bg-card p-3 shadow-card">
                    <span className={`${s.cls} h-14 rounded-btn border border-line`} />
                    <span className="text-sm">{s.name}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Type scale">
        <div className="flex flex-col gap-3 rounded-card bg-card p-(--card-pad) shadow-card">
          {typeScale.map((t) => (
            <p key={t.label} className={`${t.cls} flex flex-wrap items-baseline gap-x-3 font-medium`}>
              <span className="w-16 shrink-0 text-xs font-normal text-fg-muted">{t.label}</span>
              <span>Preorder from China</span>
            </p>
          ))}
        </div>
      </Section>

      <Section title="Radius and elevation">
        <ul className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {radii.map((r) => (
            <li
              key={r.label}
              className={`${r.cls} flex h-24 items-center justify-center bg-card p-3 text-center text-sm shadow-card`}
            >
              {r.label}
            </li>
          ))}
        </ul>
        <p className="flex h-16 items-center justify-center rounded-pill bg-inverse px-6 text-sm text-fg-inverse shadow-float sm:w-fit">
          Floating pill (shadow-float)
        </p>
      </Section>

      <Section title="Controls">
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <li className="flex h-control-lg items-center justify-center rounded-btn bg-primary text-primary-fg">
            56 lg
          </li>
          <li className="flex h-control-md items-center justify-center rounded-btn bg-primary text-primary-fg">
            48 md
          </li>
          <li className="flex h-control-sm items-center justify-center rounded-btn bg-primary text-primary-fg">
            40 sm
          </li>
        </ul>
      </Section>
    </main>
  );
}
