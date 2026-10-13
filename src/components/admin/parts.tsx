"use client";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import type { Order, OrderStatus } from "@/lib/api/types";
import { statusMeta } from "@/lib/status";

/** Status as icon + text + colour, never colour alone. */
export function StatusBadge({ status }: { status: OrderStatus }) {
  const m = statusMeta[status];
  return (
    <Badge tone={m.tone} icon={<m.icon />}>
      {m.label}
    </Badge>
  );
}

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");

/** Everything after a confirm button press: a sheet with a clear consequence and one decision. */
export function ConfirmSheet({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel = "Keep as is",
  destructive,
  loading,
  error,
  onConfirm,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  error?: string;
  onConfirm: () => void;
  children?: React.ReactNode;
}) {
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      footer={
        <div className="flex flex-col gap-3 sm:flex-row-reverse">
          <Button
            size="lg"
            block="responsive"
            variant={destructive ? "destructive" : "primary"}
            loading={loading}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
          <Button size="lg" block="responsive" variant="secondary" onClick={() => onOpenChange(false)}>
            {cancelLabel}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-3 text-fg-secondary">
        {children}
        {error && (
          <p role="alert" className="rounded-card bg-danger-soft p-3 text-sm text-danger">
            {error}
          </p>
        )}
      </div>
    </Sheet>
  );
}

export type { Order };
