"use client";

import {
  LayoutDashboard,
  LogOut,
  Package,
  ShoppingBag,
  Tags,
  Truck,
  Users,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { Wordmark } from "@/components/brand/Wordmark";
import { NoAccess } from "@/components/admin/states";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { useLogout, useSession } from "@/hooks/admin";
import type { Role } from "@/lib/api/types";
import { cn } from "@/lib/cn";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Roles that may see and open this screen. */
  roles: Role[];
}

/** The menu is built per role: Ghana staff never even see owner-only screens. */
export const adminNav: NavItem[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, roles: ["owner", "ghana_staff"] },
  { href: "/admin/orders", label: "Orders", icon: ShoppingBag, roles: ["owner", "ghana_staff"] },
  { href: "/admin/batches", label: "Batches", icon: Truck, roles: ["owner", "ghana_staff"] },
  { href: "/admin/products", label: "Products", icon: Package, roles: ["owner"] },
  { href: "/admin/categories", label: "Categories", icon: Tags, roles: ["owner"] },
  { href: "/admin/staff", label: "Staff", icon: Users, roles: ["owner"] },
];

const roleLabel: Record<Role, string> = { owner: "Owner", ghana_staff: "Ghana staff" };

const isActive = (pathname: string, href: string) =>
  href === "/admin" ? pathname === "/admin" : pathname === href || pathname.startsWith(`${href}/`);

/** Renders children only for the listed role; otherwise a "no access" panel and no data fetching. */
export function RoleGate({ role, children }: { role: Role; children: React.ReactNode }) {
  const session = useSession();
  if (!session.data) return null;
  return session.data.user.role === role ? <>{children}</> : <NoAccess />;
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const session = useSession();
  const logout = useLogout();
  const user = session.data?.user;

  useEffect(() => {
    if (session.isSuccess && !session.data) router.replace("/admin/login");
  }, [session.isSuccess, session.data, router]);

  if (!user) {
    return (
      <div className="container-page flex flex-col gap-4 py-8" aria-busy="true" aria-label="Loading admin">
        <Skeleton className="h-12 rounded-btn" />
        <Skeleton className="h-64 rounded-card" />
      </div>
    );
  }

  const items = adminNav.filter((i) => i.roles.includes(user.role));

  const signOut = () => logout.mutate(undefined, { onSuccess: () => router.replace("/admin/login") });

  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      <aside className="hidden w-64 shrink-0 flex-col gap-6 border-r border-line bg-card p-5 lg:flex">
        <Link href="/admin" aria-label="Admin home" className="inline-flex min-h-hit items-center">
          <Wordmark />
        </Link>
        <nav aria-label="Admin" className="flex flex-col gap-1">
          {items.map((i) => (
            <Link
              key={i.href}
              href={i.href}
              aria-current={isActive(pathname, i.href) ? "page" : undefined}
              className={cn(
                "flex min-h-hit items-center gap-3 rounded-btn px-3 text-sm font-medium text-fg-secondary transition-colors hover:bg-subtle hover:text-fg",
                isActive(pathname, i.href) && "bg-subtle text-fg",
              )}
            >
              <i.icon className="size-5" aria-hidden /> {i.label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto flex flex-col gap-3 text-sm">
          <div>
            <p className="font-medium">{user.name}</p>
            <Badge tone={user.role === "owner" ? "accent" : "neutral"} className="mt-1">
              {roleLabel[user.role]}
            </Badge>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={signOut} loading={logout.isPending}>
              <LogOut className="size-4" aria-hidden /> Sign out
            </Button>
            <ThemeToggle />
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-line bg-page/90 backdrop-blur-md lg:hidden">
          <div className="container-page flex h-14 items-center justify-between gap-3">
            <Link href="/admin" aria-label="Admin home" className="inline-flex min-h-hit items-center">
              <Wordmark />
            </Link>
            <div className="flex items-center gap-2">
              <Badge tone={user.role === "owner" ? "accent" : "neutral"}>{roleLabel[user.role]}</Badge>
              <Button
                variant="secondary"
                size="sm"
                onClick={signOut}
                loading={logout.isPending}
                aria-label="Sign out"
              >
                <LogOut className="size-4" aria-hidden />
              </Button>
            </div>
          </div>
          <nav aria-label="Admin" className="container-page no-scrollbar flex gap-1 overflow-x-auto pb-2">
            {items.map((i) => (
              <Link
                key={i.href}
                href={i.href}
                aria-current={isActive(pathname, i.href) ? "page" : undefined}
                className={cn(
                  "inline-flex min-h-hit shrink-0 items-center gap-2 rounded-pill px-4 text-sm font-medium whitespace-nowrap text-fg-secondary",
                  isActive(pathname, i.href) ? "bg-card text-fg shadow-card" : "hover:bg-subtle",
                )}
              >
                <i.icon className="size-4" aria-hidden /> {i.label}
              </Link>
            ))}
          </nav>
        </header>

        <main id="main" className="container-page flex w-full max-w-6xl flex-1 flex-col gap-6 py-6 md:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
