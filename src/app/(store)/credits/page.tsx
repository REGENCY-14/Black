import type { Metadata } from "next";
import { Container } from "@/components/layout/Container";
import { photoCredits } from "@/config/photoCredits";

export const metadata: Metadata = {
  title: "Photo credits",
  description: "Credits for the photographs used on this site.",
};

const licenseName = (c: (typeof photoCredits)[number]) =>
  c.license === "cc0" ? "CC0 (public domain)" : c.license === "pdm" ? "Public domain mark" : `CC ${c.license.toUpperCase()} ${c.licenseVersion}`;

/** Required by the licence of several photos (CC BY), so it is public and linked from the footer. */
export default function CreditsPage() {
  return (
    <Container className="max-w-3xl py-6 md:py-10">
      <h1 className="text-2xl font-semibold md:text-3xl">Photo credits</h1>
      <p className="mt-2 text-fg-secondary">
        Some photographs on this site are openly licensed images from Openverse. We thank the photographers. They are used
        for illustration until we replace them with photos of our own products.
      </p>
      <ul className="mt-6 flex flex-col divide-y divide-line rounded-card bg-card shadow-card">
        {photoCredits.map((c) => (
          <li key={c.file} className="flex flex-col gap-0.5 p-4 text-sm">
            <p className="font-medium">{c.title || c.label}</p>
            <p className="text-fg-secondary">
              By{" "}
              {c.creatorUrl ? (
                <a href={c.creatorUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
                  {c.creator}
                </a>
              ) : (
                c.creator
              )}
              {" · "}
              {c.licenseUrl ? (
                <a href={c.licenseUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
                  {licenseName(c)}
                </a>
              ) : (
                licenseName(c)
              )}
              {c.sourceUrl && (
                <>
                  {" · "}
                  <a href={c.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
                    Original
                  </a>
                </>
              )}
            </p>
          </li>
        ))}
      </ul>
    </Container>
  );
}
