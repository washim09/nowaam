"use client";

import { usePathname } from "next/navigation";

export function SiteFooter() {
  const pathname = usePathname();
  if (pathname.startsWith("/super-admin")) return null;

  return (
    <footer className="section-shell pb-10 pt-8">
      <div className="surface-panel px-5 py-6 sm:px-6">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-lg font-semibold tracking-[-0.03em] text-brand-900">
              Nowaam Marketplace
            </p>
            <p className="mt-1 text-sm text-stone-500">
              A modern multi-category marketplace for manufacturers, retail buyers, and
              wholesale orders.
            </p>
          </div>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-8">
            <div className="flex flex-wrap gap-2 text-xs uppercase tracking-[0.22em] text-brand-500">
              <span className="rounded-full bg-white/70 px-3 py-2">Manufacturers</span>
              <span className="rounded-full bg-white/70 px-3 py-2">Multi-Category</span>
              <span className="rounded-full bg-white/70 px-3 py-2">Retail + Bulk</span>
            </div>
            <div className="flex flex-col gap-1.5 text-sm">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-brand-400">
                For Sellers
              </p>
              <a href="/sell-on-nowaam" className="font-medium text-brand-700 hover:text-brand-900 transition-colors">
                Sell on Nowaam
              </a>
              <a href="/auth/signin?callbackUrl=/seller" className="text-stone-500 hover:text-brand-700 transition-colors">
                Seller Sign In
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
