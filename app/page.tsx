import Link from "next/link";

import { buttonStyles } from "@/components/Button";
import { getManufacturerName, getProductCategory } from "@/lib/catalog";
import { ProductCatalog } from "@/components/ProductCatalog";
import { COMPANY_TAGLINE } from "@/lib/constants";
import { getAllProducts } from "@/lib/product-service";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const products = await getAllProducts();
  const heroProduct = products[0];
  const supportProduct = products[1];
  const locationCount = new Set(products.map((product) => product.location)).size;
  const categoryCount = new Set(products.map((product) => getProductCategory(product))).size;
  const manufacturerCount = new Set(products.map((product) => getManufacturerName(product))).size;

  return (
    <div className="space-y-10 pb-8 pt-4">
      <section className="section-shell">
        <div className="surface-elevated overflow-hidden p-3 sm:p-4">
          <div className="grid gap-4 lg:grid-cols-[1.08fr_0.92fr]">
            <div className="relative min-h-[420px] overflow-hidden rounded-[30px] bg-brand-900 p-5 text-white sm:min-h-[520px] sm:p-8">
              <img
                src={
                  heroProduct?.image ||
                  "https://images.unsplash.com/photo-1511556820780-d912e42b4980?auto=format&fit=crop&w=1200&q=80"
                }
                alt={heroProduct?.name || "Marketplace collection"}
                className="absolute inset-0 h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(28,16,10,0.82)_0%,rgba(28,16,10,0.48)_50%,rgba(28,16,10,0.18)_100%)]" />
              <div className="relative flex h-full flex-col justify-between">
                <div className="space-y-5">
                  <span className="eyebrow border-white/10 bg-white/10 text-white">
                    Manufacturer Marketplace
                  </span>
                  <div className="space-y-4">
                    <h1 className="max-w-3xl text-4xl font-semibold tracking-[-0.06em] sm:text-5xl lg:text-7xl">
                      One storefront for fashion, electronics, home, beauty, and more.
                    </h1>
                    <p className="max-w-2xl text-sm leading-6 text-white/78 sm:text-base sm:leading-7 lg:text-lg">
                      {COMPANY_TAGLINE} Built for manufacturers to list products with retail and
                      wholesale pricing, and for buyers to browse across categories in one polished
                      marketplace experience.
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <Link
                    href="/products"
                    className={buttonStyles({
                      variant: "primary",
                      size: "lg",
                      className: "bg-white text-brand-900 hover:bg-sand-100",
                    })}
                  >
                    Shop Now
                  </Link>
                  <Link
                    href="/admin/add-product"
                    className={buttonStyles({
                      variant: "secondary",
                      size: "lg",
                      className: "border-white/20 bg-white/10 text-white hover:bg-white/15",
                    })}
                  >
                    Add Product
                  </Link>
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
              <div className="surface-panel p-5">
                <p className="text-[11px] uppercase tracking-[0.2em] text-brand-500">Curated for</p>
                <h2 className="mt-3 text-2xl font-semibold tracking-[-0.05em] text-brand-900 sm:text-3xl">
                  Multi-category discovery and bulk-ready buying
                </h2>
                <p className="mt-3 text-sm leading-6 text-stone-500">
                  Large imagery, refined cards, and instant retail-to-wholesale pricing shifts make
                  the marketplace feel closer to a premium shopping app than a basic listing page.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="surface-panel p-5">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-brand-500">Categories</p>
                  <p className="mt-3 text-4xl font-semibold tracking-[-0.05em] text-brand-900">
                    {categoryCount}
                  </p>
                </div>
                <div className="surface-dark p-5">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-white/60">Manufacturers</p>
                  <p className="mt-3 text-4xl font-semibold tracking-[-0.05em]">{manufacturerCount}</p>
                </div>
                <div className="surface-panel p-5">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-brand-500">Locations</p>
                  <p className="mt-3 text-2xl font-semibold tracking-[-0.05em] text-brand-900">
                    {locationCount}
                  </p>
                </div>
              </div>

              <div className="surface-panel overflow-hidden">
                <div className="grid h-full gap-4 p-4 sm:grid-cols-[0.8fr_1.2fr]">
                  <div className="overflow-hidden rounded-[24px] bg-brand-100">
                    <img
                      src={
                        supportProduct?.image ||
                        heroProduct?.image ||
                        "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&w=900&q=80"
                      }
                      alt={supportProduct?.name || "Marketplace detail"}
                      className="h-56 w-full object-cover sm:h-full"
                    />
                  </div>
                  <div className="flex flex-col justify-between gap-4 py-1">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.2em] text-brand-500">
                        Spotlight
                      </p>
                      <h3 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-brand-900">
                        {supportProduct?.name || "High-intent marketplace listings"}
                      </h3>
                      <p className="mt-3 text-sm leading-6 text-stone-500">
                        Marketplace inventory can span fashion, electronics, home goods, beauty, and
                        accessories while still sharing the same clean premium interface.
                      </p>
                    </div>
                    <Link
                      href={supportProduct ? `/products/${supportProduct._id}` : "/products"}
                      className={buttonStyles({ variant: "secondary", size: "md" })}
                    >
                      Explore feature
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <ProductCatalog
        products={products}
        title="Marketplace inventory, ready to filter, compare, and buy"
        description="Browse a multi-category product wall that feels native, quiet, and polished while still surfacing manufacturer, retail, and wholesale information clearly."
        showHeroStats={false}
      />
    </div>
  );
}
