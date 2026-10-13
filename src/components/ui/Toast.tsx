"use client";

import * as RToast from "@radix-ui/react-toast";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";
import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { cn } from "@/lib/cn";

type Tone = "success" | "danger" | "info";
interface ToastItem {
  id: number;
  title: string;
  description?: string;
  tone: Tone;
}

const Ctx = createContext<{ toast: (t: Omit<ToastItem, "id" | "tone"> & { tone?: Tone }) => void } | null>(
  null,
);

export function useToast() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}

const icons = { success: CheckCircle2, danger: AlertCircle, info: Info } as const;
const tones: Record<Tone, string> = { success: "text-success", danger: "text-danger", info: "text-info" };

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const toast = useCallback<NonNullable<React.ContextType<typeof Ctx>>["toast"]>((t) => {
    setItems((prev) => [...prev, { id: Date.now() + Math.random(), tone: "info", ...t }]);
  }, []);
  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <Ctx.Provider value={value}>
      <RToast.Provider swipeDirection="down" duration={5000}>
        {children}
        {items.map((t) => {
          const Icon = icons[t.tone];
          return (
            <RToast.Root
              key={t.id}
              onOpenChange={(open) => !open && setItems((prev) => prev.filter((i) => i.id !== t.id))}
              className="flex items-start gap-3 rounded-card border border-line bg-card p-4 shadow-float data-[state=open]:animate-[sheet-up_200ms_ease-out]"
            >
              <Icon className={cn("mt-0.5 size-5 shrink-0", tones[t.tone])} aria-hidden />
              <div className="flex-1">
                <RToast.Title className="text-sm font-semibold">{t.title}</RToast.Title>
                {t.description && (
                  <RToast.Description className="text-sm text-fg-muted">{t.description}</RToast.Description>
                )}
              </div>
              <RToast.Close
                aria-label="Dismiss"
                className="-m-2 inline-flex size-hit items-center justify-center rounded-pill hover:bg-subtle"
              >
                <X className="size-4" aria-hidden />
              </RToast.Close>
            </RToast.Root>
          );
        })}
        <RToast.Viewport className="fixed inset-x-0 bottom-0 z-[60] m-0 flex list-none flex-col gap-2 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] outline-none sm:inset-x-auto sm:right-0 sm:w-96" />
      </RToast.Provider>
    </Ctx.Provider>
  );
}
