"use client";

import { Search } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import type { OrderLookup } from "@/lib/api/types";
import { isValidGhPhone, normalizeGhPhone, normalizeOrderNumber } from "@/lib/phone";

/** Phone or email, as used to verify ownership of an order (SRS FR-5.4). */
function contactError(value: string): string | undefined {
  const v = value.trim();
  if (!v) return "Enter the phone number or email you used when you ordered.";
  if (v.includes("@")) return /^\S+@\S+\.\S+$/.test(v) ? undefined : "Enter a valid email address.";
  return isValidGhPhone(v) ? undefined : "Enter a Ghana phone number, for example 024 123 4567, or an email.";
}

/**
 * Order number + phone/email. Forgiving about spacing and case. Used by Track and /pay.
 * `loading` keeps the button width steady while the lookup runs.
 */
export function OrderLookupForm({
  defaultOrderNumber = "",
  defaultContact = "",
  submitLabel,
  loading,
  error,
  onSubmit,
}: {
  defaultOrderNumber?: string;
  defaultContact?: string;
  submitLabel: string;
  loading?: boolean;
  /** Error from the lookup itself (not found, network). */
  error?: string;
  onSubmit: (lookup: OrderLookup) => void;
}) {
  const [orderNumber, setOrderNumber] = useState(defaultOrderNumber);
  const [contact, setContact] = useState(defaultContact);
  const [errors, setErrors] = useState<{ order?: string; contact?: string }>({});

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const num = normalizeOrderNumber(orderNumber);
    const next = {
      order: num.length < 4 ? "Enter your order number, for example ORD-4F7K2Q." : undefined,
      contact: contactError(contact),
    };
    setErrors(next);
    if (next.order || next.contact) return;
    const c = contact.trim();
    onSubmit({ orderNumber: num, contact: c.includes("@") ? c : (normalizeGhPhone(c) ?? c) });
  };

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      <Field label="Order number" error={errors.order}>
        <Input
          autoCapitalize="characters"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          placeholder="ORD-4F7K2Q"
          value={orderNumber}
          onChange={(e) => setOrderNumber(e.target.value)}
        />
      </Field>
      <Field
        label="Phone number or email"
        hint="The one you used when you ordered. This keeps your order private."
        error={errors.contact}
      >
        <Input
          autoComplete="off"
          inputMode="email"
          autoCapitalize="none"
          value={contact}
          onChange={(e) => setContact(e.target.value)}
        />
      </Field>
      {error && (
        <p role="alert" className="rounded-card bg-danger-soft p-4 text-sm text-danger">
          {error}
        </p>
      )}
      <Button type="submit" size="lg" block="responsive" loading={loading} className="self-start">
        <Search className="size-5" aria-hidden /> {submitLabel}
      </Button>
    </form>
  );
}
