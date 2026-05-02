import Link from "next/link";

import { HeartIcon } from "@/components/Icons";
import { getBulkSavings, getManufacturerName, getProductCategory } from "@/lib/catalog";
import { cn, formatCurrency } from "@/lib/utils";
import type { ProductRecord } from "@/types";

type ProductCardProps = {
  product: ProductRecord;
  isWishlisted?: boolean;
  onToggleWishlist?: (productId: string) => void;
};

export function ProductCard({
  product,
  isWishlisted = false,
  onToggleWishlist,
}: ProductCardProps) {
  const savingsPerUnit = getBulkSavings(product);
  const category = getProductCategory(product);
  const manufacturerName = getManufacturerName(product);

  return (
    <article className="surface-card group overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
      <div className="relative h-56 overflow-hidden bg-brand-100 sm:h-64">
        <img
          src={product.image}
          alt={product.name}
          className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
        />
        <div className="absolute inset-x-4 top-4 flex items-start justify-between gap-3">
          <span className="rounded-full bg-white/85 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-700 shadow-sm backdrop-blur">
            {category}
          </span>
          <button
            type="button"
            onClick={() => onToggleWishlist?.(product._id)}
            className={cn(
              "inline-flex h-10 w-10 items-center justify-center rounded-full border shadow-sm backdrop-blur transition-all duration-300",
              isWishlisted
                ? "border-brand-700 bg-brand-700 text-white"
                : "border-white/85 bg-white/85 text-brand-700 hover:bg-white",
            )}
            aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
          >
            <HeartIcon filled={isWishlisted} />
          </button>
        </div>

        {savingsPerUnit > 0 ? (
          <div className="absolute bottom-4 left-4 rounded-full bg-brand-700 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-white shadow-sm">
            Save {formatCurrency(savingsPerUnit)}
          </div>
        ) : null}
      </div>

      <div className="space-y-4 p-4 sm:p-5">
        <div className="space-y-2">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-lg font-semibold tracking-[-0.03em] text-brand-900 sm:text-xl">
                {product.name}
              </h3>
              <p className="mt-1 text-xs uppercase tracking-[0.18em] text-brand-500">
                {manufacturerName}
              </p>
            </div>
            <span className="rounded-full bg-brand-50 px-2.5 py-1 text-[11px] font-semibold text-brand-700">
              {product.location}
            </span>
          </div>
          <p className="line-clamp-2 text-sm leading-6 text-stone-500">{product.description}</p>
        </div>

        <div className="rounded-[24px] bg-brand-50/70 p-4">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-brand-500">From</p>
              <p className="mt-1 text-2xl font-semibold tracking-[-0.04em] text-brand-900">
                {formatCurrency(product.price)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[11px] uppercase tracking-[0.18em] text-brand-500">Bulk</p>
              <p className="mt-1 text-base font-semibold text-brand-700">
                {formatCurrency(product.bulkPrice)}
              </p>
            </div>
          </div>

          <p className="mt-3 text-sm text-brand-700">
            Automatic wholesale pricing appears when the cart reaches {product.minBulkQty} units.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-sm text-stone-500">{category} listing</span>
          <Link href={`/products/${product._id}`} className="button-primary w-full px-4 py-2.5 sm:w-auto">
            View details
          </Link>
        </div>
      </div>
    </article>
  );
}
