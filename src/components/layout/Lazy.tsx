"use client";

import { useEffect, useState, type ComponentType } from "react";

/**
 * Renders a component whose code is loaded on demand with a plain `import()`. Unlike next/dynamic,
 * this does not add the component's chunks to the page's first-load scripts, which keeps rarely-used
 * UI (the menu dialog, the install card) out of every page's initial JavaScript.
 *
 * `loader` must be a stable, module-level function. Nothing renders until `enabled` is true and the
 * code has arrived.
 */
export function Lazy<P extends object>({
  loader,
  enabled,
  props,
}: {
  loader: () => Promise<{ default: ComponentType<P> }>;
  enabled: boolean;
  props: P;
}) {
  const [Loaded, setLoaded] = useState<ComponentType<P> | null>(null);

  useEffect(() => {
    if (!enabled || Loaded) return;
    let live = true;
    void loader().then((m) => {
      if (live) setLoaded(() => m.default);
    });
    return () => {
      live = false;
    };
  }, [enabled, Loaded, loader]);

  return enabled && Loaded ? <Loaded {...props} /> : null;
}
