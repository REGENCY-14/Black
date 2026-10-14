"use client";

import { ErrorState } from "@/components/layout/ErrorState";

export default function AdminError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return <ErrorState error={error} retry={retry} homeHref="/admin" homeLabel="Back to the dashboard" />;
}
