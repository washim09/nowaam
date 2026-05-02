"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { buttonStyles } from "@/components/Button";
import { ArrowRightIcon } from "@/components/Icons";
import { useToast } from "@/components/ToastProvider";
import { QuantitySelector } from "@/components/QuantitySelector";
import { useCart } from "@/hooks/use-cart";
import { addToRecentlyViewed } from "@/hooks/use-recently-viewed";
import { getBulkSavings, getManufacturerName, getProductCategory } from "@/lib/catalog";
import { calculateLineTotal, calculateUnitPrice, hasBulkDiscount } from "@/lib/pricing";
import { formatCurrency } from "@/lib/utils";
import type { ProductRecord, SelectedVariant } from "@/types";

export function ProductDetailClient({ product }: { product: ProductRecord }) {
  const [quantity, setQuantity] = useState(1);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [activeIndex, setActiveIndex] = useState(0);

  const allImages = product.images?.length ? product.images : (product.image ? [product.image] : []);
  const { addItem } = useCart();
  const { toast } = useToast();

  useEffect(() => {
    addToRecentlyViewed(product._id);
  }, [product._id]);

  const hasVariants = (product.variants?.length ?? 0) > 0;

  const totalPriceModifier = hasVariants
    ? (product.variants ?? []).reduce((sum, variant) => {
        const selected = variant.options.find((o) => o.label === selectedOptions[variant.name]);
        return sum + (selected?.priceModifier ?? 0);
      }, 0)
    : 0;

  const effectiveProduct = totalPriceModifier
    ? { ...product, price: product.price + totalPriceModifier, bulkPrice: product.bulkPrice + totalPriceModifier }
    : product;

  const isBulkActive = hasBulkDiscount(quantity, product.minBulkQty);
  const unitPrice = calculateUnitPrice(effectiveProduct, quantity);
  const totalPrice = calculateLineTotal(effectiveProduct, quantity);
  const bulkSavings = getBulkSavings(product);
  const category = getProductCategory(product);
  const manufacturerName = getManufacturerName(product);

  const handleAddToCart = () => {
    if (hasVariants) {
      const missing = (product.variants ?? []).find((v) => !selectedOptions[v.name]);
      if (missing) {
        toast({ variant: "error", title: "Select options", description: `Please select a ${missing.name} before adding to cart.` });
        return;
      }
    }

    const variant: SelectedVariant | undefined = hasVariants
      ? (() => {
          const firstVariant = product.variants![0];
          const selectedLabel = selectedOptions[firstVariant.name];
          const option = firstVariant.options.find((o) => o.label === selectedLabel);
          return { name: firstVariant.name, optionLabel: selectedLabel, priceModifier: option?.priceModifier ?? 0 };
        })()
      : undefined;

    addItem(product, quantity, variant);
    toast({
      variant: "success",
      title: "Added to cart",
      description: `${quantity} x ${product.name}${variant ? ` (${variant.name}: ${variant.optionLabel})` : ""} is ready for checkout.`,
    });
  };

  return (
    <>
      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-4">
          <div className="surface-elevated overflow-hidden p-3">
            <div className="relative min-h-[320px] overflow-hidden rounded-[28px] bg-brand-100 sm:min-h-[420px] lg:min-h-[560px]">
              {allImages[activeIndex] && (
                <img
                  src={allImages[activeIndex]}
                  alt={`${product.name} — image ${activeIndex + 1}`}
                  className="absolute inset-0 h-full w-full object-cover transition-opacity duration-300"
                />
              )}
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(32,18,12,0.12)_0%,rgba(32,18,12,0)_42%,rgba(32,18,12,0.18)_100%)]" />

              <div className="absolute inset-x-5 top-5 flex flex-wrap gap-2">
                <span className="rounded-full bg-white/88 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-700 shadow-sm backdrop-blur">
                  {category}
                </span>
                <span className="rounded-full bg-white/88 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-700 shadow-sm backdrop-blur">
                  {product.location}
                </span>
                <span className="rounded-full bg-brand-900/85 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-white shadow-sm">
                  {product.minBulkQty}+ bulk unlock
                </span>
              </div>

              {allImages.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() => setActiveIndex((i) => (i - 1 + allImages.length) % allImages.length)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-white/80 text-brand-900 shadow backdrop-blur transition hover:bg-white"
                    aria-label="Previous image"
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveIndex((i) => (i + 1) % allImages.length)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-white/80 text-brand-900 shadow backdrop-blur transition hover:bg-white"
                    aria-label="Next image"
                  >
                    ›
                  </button>
                  <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-1.5">
                    {allImages.map((_, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setActiveIndex(i)}
                        className={`h-2 rounded-full transition-all duration-300 ${
                          i === activeIndex ? "w-5 bg-white" : "w-2 bg-white/50 hover:bg-white/75"
                        }`}
                        aria-label={`Go to image ${i + 1}`}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>

            {allImages.length > 1 && (
              <div className="hide-scrollbar mt-3 flex gap-2 overflow-x-auto pb-1">
                {allImages.map((img, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setActiveIndex(i)}
                    className={`w-16 flex-shrink-0 overflow-hidden rounded-[14px] transition-all sm:w-[72px] ${
                      i === activeIndex ? "ring-2 ring-brand-700 ring-offset-1" : "opacity-60 hover:opacity-100"
                    }`}
                  >
                    <img src={img} alt="" className="h-14 w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="surface-panel p-4">
              <p className="text-[11px] uppercase tracking-[0.18em] text-brand-500">Retail</p>
              <p className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-brand-900">
                {formatCurrency(product.price)}
              </p>
            </div>
            <div className="surface-dark p-4">
              <p className="text-[11px] uppercase tracking-[0.18em] text-white/60">Bulk</p>
              <p className="mt-3 text-3xl font-semibold tracking-[-0.05em]">
                {formatCurrency(product.bulkPrice)}
              </p>
            </div>
            <div className="surface-panel p-4">
              <p className="text-[11px] uppercase tracking-[0.18em] text-brand-500">Savings</p>
              <p className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-brand-900">
                {formatCurrency(bulkSavings)}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="surface-elevated p-6 sm:p-8">
            <div className="space-y-6">
              <div className="space-y-4">
                <span className="eyebrow">Product detail</span>
                <div className="space-y-3">
                  <h1 className="text-3xl font-semibold tracking-[-0.06em] text-brand-900 sm:text-4xl lg:text-5xl">
                    {product.name}
                  </h1>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand-500">
                    by {manufacturerName}
                  </p>
                  <p className="text-base leading-7 text-stone-500 sm:text-lg">
                    {product.description}
                  </p>
                </div>
              </div>

              {hasVariants && (
                <div className="space-y-4">
                  {(product.variants ?? []).map((variant) => (
                    <div key={variant.name}>
                      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand-500">
                        {variant.name}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {variant.options.map((option) => {
                          const isSelected = selectedOptions[variant.name] === option.label;
                          return (
                            <button
                              key={option.label}
                              type="button"
                              onClick={() =>
                                setSelectedOptions((prev) => ({
                                  ...prev,
                                  [variant.name]: option.label,
                                }))
                              }
                              className={`rounded-full border px-4 py-2 text-sm font-semibold transition-all ${
                                isSelected
                                  ? "border-brand-700 bg-brand-700 text-white"
                                  : "border-brand-200 bg-white text-brand-700 hover:border-brand-400"
                              }`}
                            >
                              {option.label}
                              {option.priceModifier !== 0 && (
                                <span className="ml-1 font-normal opacity-75">
                                  {option.priceModifier > 0 ? "+" : ""}
                                  {formatCurrency(option.priceModifier)}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="surface-panel p-5">
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.18em] text-brand-500">
                      Dynamic pricing
                    </p>
                    <p className="mt-2 text-4xl font-semibold tracking-[-0.06em] text-brand-900">
                      {formatCurrency(totalPrice)}
                    </p>
                    <p className="mt-2 text-sm text-brand-700">
                      {isBulkActive
                        ? `Bulk pricing active at ${formatCurrency(unitPrice)} per unit`
                        : `Retail pricing active until ${product.minBulkQty - 1} units`}
                    </p>
                  </div>
                  <QuantitySelector value={quantity} onChange={setQuantity} />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="surface-panel p-5">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-brand-500">
                    Wholesale trigger
                  </p>
                  <p className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-brand-900">
                    {product.minBulkQty} units
                  </p>
                  <p className="mt-2 text-sm leading-6 text-stone-500">
                    Increase quantity and the lower per-unit wholesale price applies automatically.
                  </p>
                </div>

                <div className="surface-panel p-5">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-brand-500">
                    Buying mode
                  </p>
                  <p className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-brand-900">
                    {isBulkActive ? "Wholesale active" : "Retail active"}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-stone-500">
                    Switch naturally between single-unit shopping and bulk purchasing without leaving
                    this marketplace listing.
                  </p>
                </div>
              </div>

              <div className="hidden gap-3 sm:flex">
                <button type="button" onClick={handleAddToCart} className={buttonStyles({ size: "lg" })}>
                  Add to cart
                </button>
                <Link href="/cart" className={buttonStyles({ variant: "secondary", size: "lg" })}>
                  View cart
                </Link>
              </div>
            </div>
          </div>

          <div className="surface-panel p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.18em] text-brand-500">
                  Product notes
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-brand-900">
                  Designed for tactile, premium product browsing
                </h2>
              </div>
              <ArrowRightIcon className="hidden text-brand-400 sm:block" />
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <div className="rounded-[24px] bg-white/70 p-4">
                <p className="text-sm font-semibold text-brand-900">Rounded presentation</p>
                <p className="mt-2 text-sm leading-6 text-stone-500">
                  Large imagery and softened containers keep the product front and center.
                </p>
              </div>
              <div className="rounded-[24px] bg-white/70 p-4">
                <p className="text-sm font-semibold text-brand-900">Retail to wholesale</p>
                <p className="mt-2 text-sm leading-6 text-stone-500">
                  Quantity changes instantly update the current unit price and total.
                </p>
              </div>
              <div className="rounded-[24px] bg-white/70 p-4">
                <p className="text-sm font-semibold text-brand-900">Ready for checkout</p>
                <p className="mt-2 text-sm leading-6 text-stone-500">
                  Add to cart now and move directly into the checkout and payment flow.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="fixed inset-x-4 bottom-4 z-30 sm:hidden">
        <div className="surface-elevated flex flex-col gap-3 px-4 py-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-brand-500">Total</p>
            <p className="text-2xl font-semibold tracking-[-0.05em] text-brand-900">
              {formatCurrency(totalPrice)}
            </p>
          </div>
          <button type="button" onClick={handleAddToCart} className={buttonStyles({ className: "w-full" })}>
            Add to cart
          </button>
        </div>
      </div>
    </>
  );
}
