"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useEffect, useRef, useState } from "react";

import { buttonStyles } from "@/components/Button";
import { CartIcon, ProfileIcon, SearchIcon } from "@/components/Icons";
import { NotificationBell } from "@/components/NotificationBell";
import { useCart } from "@/hooks/use-cart";
import { cn } from "@/lib/utils";

function getNavLinks(role: string | undefined) {
  const base = [
    { href: "/", label: "Home" },
    { href: "/products", label: "Products" },
  ];
  if (!role || role === "buyer") {
    return [...base, { href: "/checkout", label: "Checkout" }, { href: "/account", label: "Account" }];
  }
  if (role === "seller") {
    return [...base, { href: "/seller", label: "Dashboard" }];
  }
  return base;
}

function AccountDropdown() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const close = () => setOpen(false);

  const handleSignOut = async () => {
    close();
    await signOut({ redirect: false });
    router.push("/");
    router.refresh();
  };

  const user = session?.user;
  const role = user?.role;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="My account"
        aria-expanded={open}
        className={cn("icon-button", open && "bg-brand-100 text-brand-900")}
      >
        {status === "authenticated" ? (
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-700 text-[10px] font-bold text-white">
            {user?.name?.[0]?.toUpperCase() ?? "U"}
          </span>
        ) : (
          <ProfileIcon />
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-60 overflow-hidden rounded-2xl border border-brand-100 bg-white shadow-xl">
          {status === "loading" ? (
            <div className="px-5 py-4 text-sm text-stone-400">Loading…</div>
          ) : status === "unauthenticated" || !user ? (
            <>
              <div className="border-b border-brand-50 px-5 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-400">
                  Your Account
                </p>
              </div>
              <div className="space-y-2 p-3">
                <Link
                  href="/login"
                  onClick={close}
                  className="block w-full rounded-xl bg-brand-700 px-4 py-2.5 text-center text-sm font-semibold text-white transition-colors hover:bg-brand-800"
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  onClick={close}
                  className="block w-full rounded-xl border border-brand-200 bg-white px-4 py-2.5 text-center text-sm font-semibold text-brand-700 transition-colors hover:bg-brand-50"
                >
                  Create Account
                </Link>
              </div>
              <div className="border-t border-brand-50 px-5 py-3">
                <Link
                  href="/sell-on-nowaam"
                  onClick={close}
                  className="text-xs font-medium text-brand-500 hover:text-brand-700"
                >
                  Selling on Nowaam? →
                </Link>
              </div>
            </>
          ) : (
            <>
              <div className="border-b border-brand-50 px-5 py-3">
                <p className="truncate text-sm font-semibold text-brand-900">
                  {user.name}
                </p>
                <p className="mt-0.5 text-[11px] capitalize text-brand-400">{role}</p>
              </div>
              <div className="p-2">
                {role === "buyer" && (
                  <DropdownLink href="/account" onClick={close}>
                    My Account
                  </DropdownLink>
                )}
                {role === "seller" && (
                  <DropdownLink href="/seller" onClick={close}>
                    Seller Dashboard
                  </DropdownLink>
                )}
                {role === "admin" && (
                  <DropdownLink href="/super-admin" onClick={close}>
                    Admin Panel
                  </DropdownLink>
                )}
              </div>
              <div className="border-t border-brand-50 p-2">
                <button
                  onClick={() => void handleSignOut()}
                  className="w-full rounded-xl px-4 py-2 text-left text-sm font-medium text-rose-600 transition-colors hover:bg-rose-50"
                >
                  Sign Out
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function DropdownLink({
  href,
  onClick,
  children,
}: {
  href: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="block rounded-xl px-4 py-2 text-sm font-medium text-brand-700 transition-colors hover:bg-brand-50 hover:text-brand-900"
    >
      {children}
    </Link>
  );
}

export function Navbar() {
  const pathname = usePathname();
  if (pathname.startsWith("/super-admin")) return null;
  const { data: session } = useSession();
  const role = session?.user?.role;
  const links = getNavLinks(role);
  const { totalItems, isHydrated } = useCart();

  return (
    <header className="sticky top-0 z-40 pt-3">
      <div className="section-shell">
        <div className="surface-panel px-4 py-3 sm:px-5">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex min-w-0 items-center gap-3">
              <div className="grid h-11 w-11 flex-shrink-0 place-items-center rounded-2xl bg-brand-700 text-lg font-semibold text-white shadow-sm">
                N
              </div>
              <div className="min-w-0">
                <p className="truncate text-lg font-semibold tracking-[-0.03em] text-brand-900 sm:text-xl">
                  Nowaam
                </p>
                <p className="text-[11px] uppercase tracking-[0.26em] text-brand-500">
                  Marketplace
                </p>
              </div>
            </Link>

            <nav className="hidden flex-1 items-center justify-center gap-1 md:flex">
              <div className="flex items-center gap-1 rounded-full bg-brand-50/80 p-1">
                {links.map((link) => {
                  const isActive =
                    link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={cn(
                        "rounded-full px-4 py-2 text-sm font-medium transition-all duration-300",
                        isActive
                          ? "bg-white text-brand-900 shadow-sm"
                          : "text-brand-600 hover:bg-white/70 hover:text-brand-900",
                      )}
                    >
                      {link.label}
                    </Link>
                  );
                })}
              </div>
            </nav>

            <div className="ml-auto flex flex-shrink-0 items-center gap-2">
              <Link href="/products" aria-label="Search products" className="icon-button">
                <SearchIcon />
              </Link>
              <Link href="/cart" aria-label="Cart" className="icon-button relative">
                <CartIcon />
                <span className="absolute -right-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-brand-700 px-1.5 text-[10px] font-semibold text-white">
                  {isHydrated ? totalItems : 0}
                </span>
              </Link>
              {session?.user && <NotificationBell />}
              <AccountDropdown />
            </div>
          </div>
        </div>

        <nav className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 md:hidden">
          {links.map((link) => {
            const isActive =
              link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);

            return (
              <Link
                key={link.href}
                href={link.href}
                className={buttonStyles({
                  variant: isActive ? "primary" : "secondary",
                  size: "sm",
                  className: "w-full justify-center text-center",
                })}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
