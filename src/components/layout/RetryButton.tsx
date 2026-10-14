"use client";

import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function RetryButton() {
  return (
    <Button size="lg" block="responsive" onClick={() => window.location.reload()}>
      <RotateCcw className="size-5" aria-hidden /> Try again
    </Button>
  );
}
