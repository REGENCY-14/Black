import { cva, type VariantProps } from "class-variance-authority";
import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

const cardVariants = cva("bg-card text-fg shadow-card pad-card", {
  variants: {
    size: { md: "rounded-card", lg: "rounded-card-lg" },
  },
  defaultVariants: { size: "md" },
});

export interface CardProps extends HTMLAttributes<HTMLDivElement>, VariantProps<typeof cardVariants> {
  as?: "div" | "article" | "section" | "aside";
}

/** White tile with a soft shadow. `lg` is the hero/product card from reference 1. */
export function Card({ className, size, as: Tag = "div", ...props }: CardProps) {
  return <Tag className={cn(cardVariants({ size }), className)} {...props} />;
}

/** Media slot with the nested radius (outer radius minus card padding). Use inside `Card size="lg"`. */
export function CardMedia({
  className,
  ratio = "aspect-[4/5]",
  ...props
}: HTMLAttributes<HTMLDivElement> & { ratio?: string }) {
  return (
    <div className={cn("relative overflow-hidden rounded-media bg-subtle", ratio, className)} {...props} />
  );
}

/** Two-tone sentence from reference 1: muted words plus near-black key words. */
export function TwoTone({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("font-medium text-fg-faint", className)} {...props} />;
}

export function Key({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return <strong className={cn("font-semibold text-fg", className)} {...props} />;
}
