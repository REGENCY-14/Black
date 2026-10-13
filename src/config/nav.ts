export const mainNav = [
  { href: "/shop", label: "Shop" },
  { href: "/track", label: "Track order" },
  { href: "/#how-it-works", label: "How it works" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
] as const;

export const helpNav = [
  { href: "/track", label: "Track an order" },
  { href: "/pay", label: "Pay a balance" },
  { href: "/contact", label: "Contact us" },
] as const;

export const policyNav = [
  { href: "/policies/terms", label: "Terms of sale" },
  { href: "/policies/refunds", label: "Refunds and cancellations" },
  { href: "/policies/privacy", label: "Privacy" },
] as const;
