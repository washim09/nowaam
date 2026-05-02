"use client";

import { startTransition, useDeferredValue, useState } from "react";

import { CategorySlider } from "@/components/CategorySlider";
import { LocationFilter } from "@/components/LocationFilter";
import { ProductCard } from "@/components/ProductCard";
import { ProductGridSkeleton } from "@/components/ProductGridSkeleton";
import { useToast } from "@/components/ToastProvider";
import {
  CATALOG_CATEGORIES,
  SORT_OPTIONS,
  getBulkSavings,
  getManufacturerName,
  getProductCategory,
  type CatalogCategory,
  type SortOption,
} from "@/lib/catalog";
import { LOCATION_FILTER_OPTIONS } from "@/lib/constants";
import { useWishlist } from "@/hooks/use-wishlist";
import type { ProductRecord } from "@/types";

type ProductCatalogProps = {
  products: ProductRecord[];
  title: string;
  description: string;
  showHeroStats?: boolean;
  total?: number;
  pageLimit?: number;
};

export function ProductCatalog({
  products: initialProducts,
  title,
  description,
  showHeroStats = true,
  total = 0,
  pageLimit = 50,
}: ProductCatalogProps) {
  const [allProducts, setAllProducts] = useState<ProductRecord[]>(initialProducts);
  const [page, setPage] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<string>("All Locations");
  const [selectedCategory, setSelectedCategory] = useState<CatalogCategory>("All");
  const [sortBy, setSortBy] = useState<SortOption>("featured");
  const [searchQuery, setSearchQuery] = useState("");
  const deferredSearch = useDeferredValue(searchQuery);
  const { has, isHydrated: isWishlistHydrated, toggle } = useWishlist();

  const hasMore = allProducts.length < total;

  const handleLoadMore = async () => {
    setIsLoadingMore(true);
    try {
      const nextPage = page + 1;
      const res = await fetch(`/api/products?page=${nextPage}&limit=${pageLimit}`);
      const data = (await res.json()) as { products?: ProductRecord[] };
      if (data.products?.length) {
        setAllProducts((prev) => [...prev, ...(data.products ?? [])]);
        setPage(nextPage);
      }
    } catch {
      /* silent */ 
    } finally {
      setIsLoadingMore(false);
    }
  };

  const products = allProducts;
  const { toast } = useToast();

  const normalizedSearch = deferredSearch.trim().toLowerCase();
  const filteredProducts = products
    .filter((product) =>
      selectedLocation === "All Locations" ? true : product.location === selectedLocation,
    )
    .filter((product) => (selectedCategory === "All" ? true : getProductCategory(product) === selectedCategory))
    .filter((product) => {
      if (!normalizedSearch) {
        return true;
      }

      return `${product.name} ${product.description} ${product.location} ${product.category || ""} ${getManufacturerName(product)}`
        .toLowerCase()
        .includes(normalizedSearch);
    })
    .sort((left, right) => {
      switch (sortBy) {
        case "price-asc":
          return left.price - right.price;
        case "price-desc":
          return right.price - left.price;
        case "bulk-savings":
          return getBulkSavings(right) - getBulkSavings(left);
        default:
          return new Date(right.createdAt || 0).getTime() - new Date(left.createdAt || 0).getTime();
      }
    });
  const locationCount = new Set(products.map((product) => product.location)).size;
  const categoryCount = new Set(products.map((product) => getProductCategory(product))).size;
  const manufacturerCount = new Set(products.map((product) => getManufacturerName(product))).size;

  const handleCategoryChange = (value: CatalogCategory) => {
    startTransition(() => {
      setSelectedCategory(value);
    });
  };

  const handleWishlistToggle = (productId: string) => {
    const isAlreadySaved = has(productId);
    toggle(productId);

    toast({
      variant: "info",
      title: isAlreadySaved ? "Removed from wishlist" : "Saved to wishlist",
      description: isAlreadySaved
        ? "The product has been removed from your shortlist."
        : "The product is waiting in your shortlist.",
    });
  };

  return (
    <section className="section-shell space-y-7 pb-16">
      <div className="surface-elevated p-6 sm:p-8">
        <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-end">
          <div className="space-y-4">
            <span className="eyebrow">Catalog</span>
            <h2 className="max-w-3xl text-3xl font-semibold tracking-[-0.05em] text-brand-900 sm:text-4xl lg:text-5xl">
              {title}
            </h2>
            <p className="max-w-2xl text-sm leading-6 text-stone-500 sm:text-base sm:leading-7 lg:text-lg">
              {description}
            </p>
          </div>

          {showHeroStats ? (
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="surface-panel p-4">
                <p className="text-[11px] uppercase tracking-[0.18em] text-brand-500">Categories</p>
                <p className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-brand-900">
                  {categoryCount}
                </p>
              </div>
              <div className="surface-dark p-4">
                <p className="text-[11px] uppercase tracking-[0.18em] text-white/60">Manufacturers</p>
                <p className="mt-3 text-3xl font-semibold tracking-[-0.05em]">{manufacturerCount}</p>
              </div>
              <div className="surface-panel p-4">
                <p className="text-[11px] uppercase tracking-[0.18em] text-brand-500">Locations</p>
                <p className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-brand-900">
                  {locationCount}
                </p>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div className="space-y-4">
        <CategorySlider
          categories={CATALOG_CATEGORIES}
          selectedCategory={selectedCategory}
          onSelect={handleCategoryChange}
        />

        <div className="surface-panel p-4 sm:p-5">
          <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[1.2fr_1fr_1fr]">
              <label className="flex flex-col gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.22em] text-brand-500">
                  Search products
                </span>
                <input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  className="input-shell"
                  placeholder="Search products, brands, categories..."
                />
              </label>

              <LocationFilter
                value={selectedLocation}
                onChange={setSelectedLocation}
                options={LOCATION_FILTER_OPTIONS}
              />

              <label className="flex flex-col gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.22em] text-brand-500">
                  Sort by
                </span>
                <select
                  value={sortBy}
                  onChange={(event) => setSortBy(event.target.value as SortOption)}
                  className="input-shell"
                >
                  {SORT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="grid gap-3 rounded-[24px] bg-white/65 p-4 sm:grid-cols-2 xl:grid-cols-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.18em] text-brand-500">Showing</p>
                <p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-brand-900">
                  {filteredProducts.length}
                </p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.18em] text-brand-500">Category</p>
                <p className="mt-2 text-lg font-semibold tracking-[-0.03em] text-brand-900">
                  {selectedCategory}
                </p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.18em] text-brand-500">Manufacturers</p>
                <p className="mt-2 text-lg font-semibold tracking-[-0.03em] text-brand-900">
                  {manufacturerCount}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {!isWishlistHydrated && products.length > 0 ? (
        <ProductGridSkeleton />
      ) : filteredProducts.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {filteredProducts.map((product) => (
            <ProductCard
              key={product._id}
              product={product}
              isWishlisted={has(product._id)}
              onToggleWishlist={handleWishlistToggle}
            />
          ))}
        </div>
      ) : (
        <div className="surface-elevated p-10 text-center">
          <h3 className="text-3xl font-semibold tracking-[-0.04em] text-brand-900">
            Nothing matched this mix
          </h3>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-stone-500">
            Adjust the category, location, or search filters to explore more marketplace inventory,
            or add fresh manufacturer listings from the admin side.
          </p>
        </div>
      )}

      {hasMore && !normalizedSearch && selectedLocation === "All Locations" && selectedCategory === "All" && (
        <div className="flex justify-center pt-4">
          <button
            onClick={() => void handleLoadMore()}
            disabled={isLoadingMore}
            className="rounded-full border border-brand-200 bg-white px-8 py-3 text-sm font-semibold text-brand-700 transition-all hover:bg-brand-50 hover:shadow-sm disabled:opacity-50"
          >
            {isLoadingMore ? "Loading…" : `Load more (${total - allProducts.length} remaining)`}
          </button>
        </div>
      )}
    </section>
  );
}
