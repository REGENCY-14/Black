import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export const buttonVariants = cva(
  [
    "relative inline-flex select-none items-center justify-center gap-2 rounded-btn font-medium whitespace-nowrap",
    "transition-[transform,background-color,color,border-color] duration-150 active:scale-[0.98]",
    "disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50",
    // sm is 40px visual; this pseudo-element extends the hit area to 44px
    "before:absolute before:inset-x-0 before:-inset-y-[max(0px,calc((var(--hit-min)-100%)/2))] before:content-['']",
  ],
  {
    variants: {
      variant: {
        primary: "bg-primary text-primary-fg hover:opacity-90 active:opacity-80",
        accent: "bg-accent text-white hover:bg-accent-hover active:bg-accent-hover",
        secondary: "border border-line bg-card text-fg hover:bg-subtle active:bg-subtle",
        ghost: "bg-transparent text-fg hover:bg-subtle active:bg-subtle",
        destructive: "bg-danger-solid text-white hover:opacity-90 active:opacity-80",
        whatsapp: "bg-whatsapp text-white hover:opacity-90 active:opacity-80",
      },
      size: {
        lg: "h-control-lg px-6 text-base",
        md: "h-control-md px-5 text-base",
        sm: "h-control-sm px-4 text-sm",
      },
      block: {
        // primary CTAs are full width on mobile
        responsive: "w-full md:w-auto",
        always: "w-full",
        never: "",
      },
    },
    defaultVariants: { variant: "primary", size: "md", block: "never" },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant, size, block, asChild, loading, disabled, children, type, ...props },
  ref,
) {
  const Comp = asChild ? Slot : "button";
  const classes = cn(buttonVariants({ variant, size, block }), className);
  if (asChild) {
    return (
      <Comp ref={ref} className={classes} {...props}>
        {children}
      </Comp>
    );
  }
  return (
    <Comp
      ref={ref}
      type={type ?? "button"}
      className={classes}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {/* label stays in layout while loading so the width never jumps */}
      <span className={cn("inline-flex items-center gap-2", loading && "opacity-0")}>{children}</span>
      {loading && <Loader2 className="absolute size-5 animate-spin" aria-hidden />}
    </Comp>
  );
});

export interface IconButtonProps extends Omit<ButtonProps, "size" | "block" | "children"> {
  "aria-label": string;
  icon: React.ReactNode;
}

/** Icon-only button: always at least 44x44 with a required aria-label. */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { icon, className, variant = "secondary", ...props },
  ref,
) {
  return (
    <Button
      ref={ref}
      variant={variant}
      size="md"
      className={cn("aspect-square min-h-hit min-w-hit px-0", className)}
      {...props}
    >
      {icon}
    </Button>
  );
});
