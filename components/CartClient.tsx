"use client";

import Link from "next/link";

import { buttonStyles } from "@/components/Button";
import { QuantitySelector } from "@/components/QuantitySelector";
import { useCart } from "@/hooks/use-cart";
import { calculateLineTotal, calculateUnitPrice } from "@/lib/pricing";
import { formatCurrency } from "@/lib/utils";

export function CartClient() {
  const { items, isHydrated, subtotal, totalItems, removeItem, updateQuantity } = useCart();

  const retailEquivalent = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const savings = Math.max(retailEquivalent - subtotal, 0);

  if (!isHydrated) {
    return (
      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-4">
          {Array.from({ length: 2 }).map((_, index) => (
            <div key={index} className="surface-card overflow-hidden p-4">
              <div className="grid gap-4 sm:grid-cols-[160px_1fr]">
                <div className="shimmer h-40 rounded-[24px] bg-brand-100" />
                <div className="space-y-3">
                  <div className="shimmer h-5 w-2/3 rounded-full bg-brand-100" />
                  <div className="shimmer h-4 w-full rounded-full bg-brand-100" />
                  <div className="shimmer h-4 w-4/5 rounded-full bg-brand-100" />
                  <div className="shimmer h-16 rounded-[24px] bg-brand-100" />
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="surface-dark h-80 p-6">
          <div className="shimmer h-5 w-28 rounded-full bg-white/20" />
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="surface-elevated p-10 text-center">
        <h2 className="text-3xl font-semibold tracking-[-0.05em] text-brand-900 sm:text-4xl">
          Your cart is empty
        </h2>
        <p className="mt-3 text-sm leading-6 text-stone-500">
          Add products from any category to start mixing retail and wholesale purchases.
        </p>
        <Link href="/products" className={buttonStyles({ size: "lg", className: "mt-6" })}>
          Explore products
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
      <div className="space-y-4">
        {items.map((item) => {
          const unitPrice = calculateUnitPrice(item, item.quantity);
          const lineTotal = calculateLineTotal(item, item.quantity);
          const isBulkApplied = item.quantity >= item.minBulkQty;

          return (
            <article key={item.cartKey} className="surface-elevated overflow-hidden p-4 sm:p-5">
              <div className="grid gap-4 sm:grid-cols-[165px_1fr]">
                <div className="overflow-hidden rounded-[26px] bg-brand-100">
                  <img src={item.image} alt={item.name} className="h-56 w-full object-cover sm:h-full" />
                </div>

                <div className="space-y-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-2xl font-semibold tracking-[-0.04em] text-brand-900">
                          {item.name}
                        </h3>
                        <span className="rounded-full bg-brand-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-700">
                          {item.location}
                        </span>
                        {item.selectedVariant && (
                          <span className="rounded-full bg-stone-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-600">
                            {item.selectedVariant.name}: {item.selectedVariant.optionLabel}
                          </span>
                        )}
                      </div>
                      <p className="mt-2 max-w-xl text-sm leading-6 text-stone-500">
                        {item.description}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeItem(item.cartKey)}
                      className="rounded-full bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-600 transition-all duration-300 hover:bg-rose-100"
                    >
                      Remove
                    </button>
                  </div>

                  <div className="grid gap-4 rounded-[26px] bg-brand-50/65 p-4 lg:grid-cols-[0.85fr_0.8fr_0.75fr] lg:items-end">
                    <QuantitySelector
                      value={item.quantity}
                      onChange={(value) => updateQuantity(item.cartKey, value)}
                    />

                    <div>
                      <p className="text-[11px] uppercase tracking-[0.18em] text-brand-500">
                        Unit price
                      </p>
                      <p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-brand-900">
                        {formatCurrency(unitPrice)}
                      </p>
                      <p className="mt-1 text-sm text-brand-700">
                        {isBulkApplied
                          ? "Bulk pricing unlocked"
                          : `Bulk unlocks at ${item.minBulkQty} units`}
                      </p>
                    </div>

                    <div>
                      <p className="text-[11px] uppercase tracking-[0.18em] text-brand-500">
                        Line total
                      </p>
                      <p className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-brand-900">
                        {formatCurrency(lineTotal)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <aside className="surface-dark h-fit p-6 lg:sticky lg:top-28">
        <p className="text-[11px] uppercase tracking-[0.24em] text-white/60">Order summary</p>
        <h2 className="mt-4 text-3xl font-semibold tracking-[-0.05em] sm:text-4xl">Ready to checkout</h2>

        <div className="mt-6 space-y-4 rounded-[28px] bg-white/8 p-5">
          <div className="flex items-center justify-between text-sm text-white/80">
            <span>Products</span>
            <span>{items.length}</span>
          </div>
          <div className="flex items-center justify-between text-sm text-white/80">
            <span>Total items</span>
            <span>{totalItems}</span>
          </div>
          <div className="flex items-center justify-between text-sm text-white/80">
            <span>Bulk savings</span>
            <span>{formatCurrency(savings)}</span>
          </div>
          <div className="flex items-center justify-between text-sm text-white/80">
            <span>Subtotal</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          <div className="border-t border-white/10 pt-4">
            <div className="flex items-center justify-between">
              <span className="text-sm uppercase tracking-[0.2em] text-white/60">Total</span>
              <span className="text-3xl font-semibold tracking-[-0.05em]">
                {formatCurrency(subtotal)}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3">
          <Link
            href="/checkout"
            className={buttonStyles({
              size: "lg",
              className: "bg-white text-brand-900 hover:bg-sand-100",
            })}
          >
            Proceed to checkout
          </Link>
          <Link
            href="/products"
            className={buttonStyles({
              variant: "secondary",
              size: "lg",
              className: "border-white/15 bg-white/10 text-white hover:bg-white/15",
            })}
          >
            Continue shopping
          </Link>
        </div>

        <div className="mt-6 rounded-[24px] bg-white/8 p-4 text-sm leading-6 text-white/72">
          Quantities update wholesale pricing live, so you always see the exact payable amount before
          moving to payment.
        </div>
      </aside>
    </div>
  );
}
