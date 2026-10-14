"use client";

import { Download, Share } from "lucide-react";
import { LogoMark } from "@/components/brand/Wordmark";
import { Container } from "@/components/layout/Container";
import { Button } from "@/components/ui/Button";
import { brand } from "@/config";

/**
 * The "install the app" card. Kept in its own file so its UI code is only downloaded when the card
 * is actually shown (see InstallPrompt), not as part of every page's first load.
 */
export default function InstallCard({
  mode,
  onInstall,
  onDismiss,
}: {
  /** "prompt": the browser offers a real install. "ios": Safari needs the manual Add to Home Screen steps. */
  mode: "prompt" | "ios";
  onInstall: () => void;
  onDismiss: () => void;
}) {
  const prompt = mode === "prompt";
  return (
    <section aria-label="Install the app" className="mt-10" data-testid="install-prompt">
      <Container>
        <div className="flex flex-col gap-4 rounded-card-lg bg-card p-5 shadow-card sm:flex-row sm:items-center">
          <LogoMark className="size-12 shrink-0" />
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold">Keep {brand.name} on your phone</h2>
            {prompt ? (
              <p className="text-fg-secondary">Open it like an app and check your order in one tap.</p>
            ) : (
              <p className="flex flex-wrap items-center gap-x-1 text-fg-secondary">
                Tap <Share className="inline size-4" aria-label="Share" /> in Safari, then choose{" "}
                <strong className="font-semibold text-fg">Add to Home Screen</strong>.
              </p>
            )}
          </div>
          <div className="flex gap-2">
            {prompt && (
              <Button onClick={onInstall}>
                <Download className="size-4" aria-hidden /> Install
              </Button>
            )}
            <Button variant="ghost" onClick={onDismiss}>
              {prompt ? "Not now" : "Got it"}
            </Button>
          </div>
        </div>
      </Container>
    </section>
  );
}
