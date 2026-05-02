"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { buttonStyles } from "@/components/Button";
import { getManufacturerName, getProductCategory } from "@/lib/catalog";
import { formatCurrency, getFriendlyErrorMessage } from "@/lib/utils";
import type { ProductRecord } from "@/types";

export function AdminDashboardClient() {
  const [products, setProducts] = useState<ProductRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProducts = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/products", {
        cache: "no-store",
      });
      const data = (await response.json()) as { error?: string; products?: ProductRecord[] };

      if (!response.ok || !data.products) {
        throw new Error(data.error || "Unable to load products.");
      }

      setProducts(data.products);
    } catch (loadError) {
      setError(getFriendlyErrorMessage(loadError));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadProducts();
  }, []);

  const locationCount = new Set(products.map((product) => product.location)).size;
  const categoryCount = new Set(products.map((product) => getProductCategory(product))).size;
  const manufacturerCount = new Set(products.map((product) => getManufacturerName(product))).size;

  return (
    <div className="space-y-6">
      <div className="surface-elevated p-6 sm:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <span className="eyebrow">Admin dashboard</span>
            <h2 className="mt-4 text-3xl font-semibold tracking-[-0.05em] text-brand-900 sm:text-4xl">
              Catalog control center
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-500">
              Review marketplace coverage, refresh inventory, and keep manufacturer listings aligned
              with your multi-category retail and wholesale strategy.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button type="button" onClick={loadProducts} className={buttonStyles({ variant: "secondary", size: "lg" })}>
              Refresh products
            </button>
            <Link href="/admin/add-product" className={buttonStyles({ size: "lg" })}>
              Add product
            </Link>
          </div>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <div className="surface-panel p-5">
            <p className="text-[11px] uppercase tracking-[0.18em] text-brand-500">Categories</p>
            <p className="mt-3 text-4xl font-semibold tracking-[-0.05em] text-brand-900">
              {categoryCount}
            </p>
          </div>
          <div className="surface-dark p-5">
            <p className="text-[11px] uppercase tracking-[0.18em] text-white/60">Manufacturers</p>
            <p className="mt-3 text-4xl font-semibold tracking-[-0.05em]">{manufacturerCount}</p>
          </div>
          <div className="surface-panel p-5">
            <p className="text-[11px] uppercase tracking-[0.18em] text-brand-500">Locations</p>
            <p className="mt-3 text-4xl font-semibold tracking-[-0.05em] text-brand-900">
              {locationCount}
            </p>
          </div>
        </div>
      </div>

      <div className="surface-elevated overflow-hidden">
        <div className="border-b border-brand-100/70 px-6 py-5">
          <h3 className="text-2xl font-semibold tracking-[-0.04em] text-brand-900">
            All stored products
          </h3>
        </div>

        {isLoading ? (
          <div className="grid gap-4 p-6 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="surface-panel p-4">
                <div className="shimmer h-36 rounded-[22px] bg-brand-100" />
                <div className="mt-4 space-y-3">
                  <div className="shimmer h-4 rounded-full bg-brand-100" />
                  <div className="shimmer h-4 w-2/3 rounded-full bg-brand-100" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="px-6 py-8 text-sm text-rose-600">{error}</div>
        ) : products.length === 0 ? (
          <div className="px-6 py-8 text-sm text-stone-500">
            No products yet. Add your first manufacturer listing to populate the marketplace.
          </div>
        ) : (
          <div className="grid gap-4 p-6 sm:grid-cols-2 xl:grid-cols-3">
            {products.map((product) => (
              <article key={product._id} className="surface-panel overflow-hidden p-3">
                <div className="overflow-hidden rounded-[24px] bg-brand-100">
                  <img src={product.image} alt={product.name} className="h-48 w-full object-cover" />
                </div>
                <div className="space-y-3 p-2 pt-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="text-lg font-semibold tracking-[-0.03em] text-brand-900">
                        {product.name}
                      </h4>
                      <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-brand-500">
                        {getManufacturerName(product)}
                      </p>
                    </div>
                    <span className="rounded-full bg-brand-50 px-3 py-1 text-[11px] font-semibold text-brand-700">
                      {getProductCategory(product)}
                    </span>
                  </div>
                  <p className="line-clamp-2 text-sm leading-6 text-stone-500">{product.description}</p>
                  <div className="grid grid-cols-2 gap-3 rounded-[22px] bg-white/70 p-3">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.18em] text-brand-500">Retail</p>
                      <p className="mt-1 font-semibold text-brand-900">{formatCurrency(product.price)}</p>
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.18em] text-brand-500">Bulk</p>
                      <p className="mt-1 font-semibold text-brand-700">{formatCurrency(product.bulkPrice)}</p>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center justify-between px-1 text-xs text-stone-500">
                    <span>{product.location}</span>
                    <span>{product.minBulkQty}+ bulk units</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
