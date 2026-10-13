import { cn } from "@/lib/cn";

/** Max 1280px, with the fluid page gutter. */
export function Container({
  className,
  as: Tag = "div",
  ...props
}: React.HTMLAttributes<HTMLElement> & { as?: "div" | "section" | "main" | "header" | "footer" }) {
  return <Tag className={cn("container-page", className)} {...props} />;
}
