"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

import { buttonStyles } from "@/components/Button";
import { useToast } from "@/components/ToastProvider";
import { useCart } from "@/hooks/use-cart";
import { addOrderToHistory } from "@/hooks/use-order-history";
import { COMPANY_NAME, LOCATIONS } from "@/lib/constants";
import { loadRazorpayCheckout } from "@/lib/payment";
import { calculateLineTotal, calculateUnitPrice } from "@/lib/pricing";
import { formatCurrency, getFriendlyErrorMessage } from "@/lib/utils";

type CreateOrderResponse = {
  amount: number;
  currency: string;
  internalOrderId: string;
  keyId: string;
  orderId: string;
  success: boolean;
  discountAmount?: number;
  itemsTotal?: number;
};

type AppliedCoupon = {
  code: string;
  discountType: "percent" | "fixed";
  discountValue: number;
  discount: number;
};

const initialAddressState = {
  fullName: "",
  phone: "",
  addressLine: "",
  area: "",
  city: "",
  pincode: "",
};

export function CheckoutClient() {
  const { data: session } = useSession();
  const { items, isHydrated, subtotal, clearCart } = useCart();
  const { toast } = useToast();
  const [userLocation, setUserLocation] = useState<string>(LOCATIONS[0]);
  const [addressState, setAddressState] = useState(initialAddressState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successOrderId, setSuccessOrderId] = useState<string | null>(null);
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);
  const [isCouponLoading, setIsCouponLoading] = useState(false);

  useEffect(() => {
    if (session?.user?.name) {
      setAddressState((prev) => ({
        ...prev,
        fullName: prev.fullName || (session.user.name ?? ""),
      }));
    }
  }, [session]);

  const discountedTotal = appliedCoupon ? Math.max(0, subtotal - appliedCoupon.discount) : subtotal;

  const handleFieldChange = (field: keyof typeof initialAddressState, value: string) => {
    setAddressState((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleApplyCoupon = async () => {
    if (!couponInput.trim()) return;
    setIsCouponLoading(true);
    try {
      const res = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: couponInput.trim(), orderTotal: subtotal }),
      });
      const data = (await res.json()) as AppliedCoupon & { valid?: boolean; error?: string };
      if (!res.ok || !data.valid) {
        toast({ variant: "error", title: "Coupon invalid", description: data.error ?? "Invalid coupon." });
        setAppliedCoupon(null);
      } else {
        setAppliedCoupon(data);
        toast({ variant: "success", title: "Coupon applied!", description: `You saved ${formatCurrency(data.discount)}.` });
      }
    } catch {
      toast({ variant: "error", title: "Error", description: "Could not validate coupon." });
    } finally {
      setIsCouponLoading(false);
    }
  };

  const validateAddress = () => {
    if (!addressState.fullName.trim() || !addressState.phone.trim() || !addressState.addressLine.trim()) {
      toast({
        variant: "error",
        title: "Address details missing",
        description: "Please complete your name, phone number, and address before paying.",
      });
      return false;
    }

    return true;
  };

  const handlePayment = async () => {
    if (!items.length) {
      toast({
        variant: "info",
        title: "Cart is empty",
        description: "Add at least one product before starting payment.",
      });
      return;
    }

    if (!validateAddress()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const scriptLoaded = await loadRazorpayCheckout();

      if (!scriptLoaded) {
        throw new Error("Razorpay Checkout could not be loaded.");
      }

      const response = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          items: items.map((item) => ({
            productId: item._id,
            quantity: item.quantity,
          })),
          userLocation,
          deliveryAddress: {
            fullName: addressState.fullName,
            phone: addressState.phone,
            addressLine: addressState.addressLine,
            area: addressState.area,
            city: addressState.city || userLocation,
            pincode: addressState.pincode,
          },
          couponCode: appliedCoupon?.code ?? null,
        }),
      });

      const data = (await response.json()) as CreateOrderResponse & { error?: string };

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Unable to create your order.");
      }

      if (!window.Razorpay) {
        throw new Error("Razorpay Checkout is unavailable on this device.");
      }

      const paymentObject = new window.Razorpay({
        key: data.keyId,
        amount: data.amount,
        currency: data.currency,
        name: COMPANY_NAME,
        description: "Marketplace order payment",
        order_id: data.orderId,
        prefill: {
          name: addressState.fullName,
          contact: addressState.phone,
        },
        notes: {
          internalOrderId: data.internalOrderId,
          userLocation,
          city: addressState.city || userLocation,
        },
        theme: {
          color: "#7c4f2f",
        },
        handler: async (paymentResponse) => {
          try {
            const verifyResponse = await fetch("/api/orders/verify", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                internalOrderId: data.internalOrderId,
                razorpay_order_id: paymentResponse.razorpay_order_id,
                razorpay_payment_id: paymentResponse.razorpay_payment_id,
                razorpay_signature: paymentResponse.razorpay_signature,
              }),
            });

            const verifyData = (await verifyResponse.json()) as {
              error?: string;
              success?: boolean;
            };

            if (!verifyResponse.ok || !verifyData.success) {
              throw new Error(verifyData.error || "Payment verification failed.");
            }

            addOrderToHistory(data.internalOrderId, session?.user?.id ?? "");
            clearCart();
            setSuccessOrderId(data.internalOrderId);
            toast({
              variant: "success",
              title: "Payment successful",
              description: "Your order has been confirmed and marked as paid.",
            });
          } catch (error) {
            toast({
              variant: "error",
              title: "Verification failed",
              description: getFriendlyErrorMessage(error),
            });
          } finally {
            setIsSubmitting(false);
          }
        },
        modal: {
          ondismiss: () => {
            setIsSubmitting(false);
            toast({
              variant: "info",
              title: "Checkout paused",
              description: "You can resume payment whenever you're ready.",
            });
          },
          backdropclose: false,
          escape: true,
        },
      });

      paymentObject.open();
    } catch (error) {
      setIsSubmitting(false);
      toast({
        variant: "error",
        title: "Checkout failed",
        description: getFriendlyErrorMessage(error),
      });
    }
  };

  if (!isHydrated) {
    return (
      <div className="grid gap-6 lg:grid-cols-[1.08fr_0.92fr]">
        <div className="surface-elevated p-6">
          <div className="shimmer h-6 w-40 rounded-full bg-brand-100" />
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="shimmer h-14 rounded-2xl bg-brand-100" />
            ))}
          </div>
        </div>
        <div className="surface-dark p-6">
          <div className="shimmer h-6 w-28 rounded-full bg-white/20" />
        </div>
      </div>
    );
  }

  if (successOrderId) {
    return (
      <div className="surface-elevated p-10 text-center">
        <span className="eyebrow">Order confirmed</span>
        <h2 className="mt-4 text-3xl font-semibold tracking-[-0.05em] text-brand-900 sm:text-4xl">
          Payment completed successfully
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-stone-500">
          Your payment was verified and your internal order ID is{" "}
          <span className="font-semibold text-brand-700">{successOrderId}</span>.
        </p>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="/" className={buttonStyles({ size: "lg" })}>
            Back to homepage
          </Link>
          <Link href="/products" className={buttonStyles({ variant: "secondary", size: "lg" })}>
            Shop more products
          </Link>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="surface-elevated p-10 text-center">
        <h2 className="text-3xl font-semibold tracking-[-0.05em] text-brand-900 sm:text-4xl">
          Nothing to checkout yet
        </h2>
        <p className="mt-3 text-sm leading-6 text-stone-500">
          Add items to your cart, then return here to complete your Razorpay payment.
        </p>
        <Link href="/products" className={buttonStyles({ size: "lg", className: "mt-6" })}>
          Browse products
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.08fr_0.92fr]">
      <section className="surface-elevated p-6 sm:p-8">
        <div className="space-y-6">
          <div>
            <span className="eyebrow">Checkout</span>
            <h2 className="mt-4 text-3xl font-semibold tracking-[-0.05em] text-brand-900 sm:text-4xl">
              Delivery and payment details
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-500">
              Enter your address, review the live order summary, and complete payment in the Razorpay
              test checkout flow.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.22em] text-brand-500">
                Full name
              </span>
              <input
                value={addressState.fullName}
                onChange={(event) => handleFieldChange("fullName", event.target.value)}
                className="input-shell"
                placeholder="Rohan Sharma"
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.22em] text-brand-500">
                Phone number
              </span>
              <input
                value={addressState.phone}
                onChange={(event) => handleFieldChange("phone", event.target.value)}
                className="input-shell"
                placeholder="+91 98765 43210"
              />
            </label>

            <label className="flex flex-col gap-2 sm:col-span-2">
              <span className="text-xs font-semibold uppercase tracking-[0.22em] text-brand-500">
                Address line
              </span>
              <input
                value={addressState.addressLine}
                onChange={(event) => handleFieldChange("addressLine", event.target.value)}
                className="input-shell"
                placeholder="House number, street, landmark"
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.22em] text-brand-500">
                Area
              </span>
              <input
                value={addressState.area}
                onChange={(event) => handleFieldChange("area", event.target.value)}
                className="input-shell"
                placeholder="South Extension"
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.22em] text-brand-500">
                City
              </span>
              <input
                value={addressState.city}
                onChange={(event) => handleFieldChange("city", event.target.value)}
                className="input-shell"
                placeholder="Delhi"
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.22em] text-brand-500">
                Pincode
              </span>
              <input
                value={addressState.pincode}
                onChange={(event) => handleFieldChange("pincode", event.target.value)}
                className="input-shell"
                placeholder="110001"
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.22em] text-brand-500">
                Delivery location
              </span>
              <select
                value={userLocation}
                onChange={(event) => setUserLocation(event.target.value)}
                className="input-shell"
              >
                {LOCATIONS.map((location) => (
                  <option key={location} value={location}>
                    {location}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="surface-panel p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.18em] text-brand-500">
                  Payment mode
                </p>
                <h3 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-brand-900">
                  Razorpay test checkout
                </h3>
              </div>
              <span className="rounded-full bg-brand-50 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-700">
                Test mode
              </span>
            </div>
            <p className="mt-3 text-sm leading-6 text-stone-500">
              The order is created on the backend first, and payment is marked successful only after
              signature verification.
            </p>
          </div>
        </div>
      </section>

      <aside className="space-y-4 lg:sticky lg:top-28 lg:h-fit">
        <div className="surface-dark p-6">
          <p className="text-[11px] uppercase tracking-[0.24em] text-white/60">Order summary</p>
          <h2 className="mt-4 text-3xl font-semibold tracking-[-0.05em] sm:text-4xl">Review and pay</h2>

          <div className="mt-6 space-y-3 rounded-[28px] bg-white/8 p-4">
            {items.map((item) => {
              const unitPrice = calculateUnitPrice(item, item.quantity);
              const lineTotal = calculateLineTotal(item, item.quantity);

              return (
                <div key={item._id} className="rounded-[22px] bg-white/8 p-3">
                  <div className="flex gap-3">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="h-20 w-20 rounded-[18px] object-cover"
                    />
                    <div className="flex-1">
                      <p className="text-base font-semibold">{item.name}</p>
                      <p className="mt-1 text-sm text-white/65">
                        {item.quantity} x {formatCurrency(unitPrice)}
                      </p>
                      <p className="mt-3 text-lg font-semibold">{formatCurrency(lineTotal)}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 rounded-[28px] bg-white/8 p-4">
            <p className="text-[11px] uppercase tracking-[0.18em] text-white/60">Coupon code</p>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
              <input
                value={couponInput}
                onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === "Enter" && void handleApplyCoupon()}
                placeholder="e.g. SAVE20"
                className="flex-1 rounded-xl bg-white/12 px-3 py-2 text-sm text-white placeholder-white/35 outline-none ring-1 ring-white/10 focus:ring-white/30"
                disabled={!!appliedCoupon}
              />
              {appliedCoupon ? (
                <button
                  onClick={() => { setAppliedCoupon(null); setCouponInput(""); }}
                  className="rounded-xl bg-rose-500/80 px-3 py-2 text-xs font-semibold text-white"
                >
                  Remove
                </button>
              ) : (
                <button
                  onClick={() => void handleApplyCoupon()}
                  disabled={isCouponLoading || !couponInput.trim()}
                  className="rounded-xl bg-white/15 px-3 py-2 text-xs font-semibold text-white disabled:opacity-40"
                >
                  {isCouponLoading ? "..." : "Apply"}
                </button>
              )}
            </div>
            {appliedCoupon && (
              <p className="mt-2 text-xs font-semibold text-emerald-400">
                ✓ {appliedCoupon.code} — {formatCurrency(appliedCoupon.discount)} off
              </p>
            )}
          </div>

          <div className="mt-4 space-y-3 rounded-[28px] bg-white/8 p-5 text-sm text-white/78">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span>Location</span>
              <span>{userLocation}</span>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span>Items total</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            {appliedCoupon && (
              <div className="flex flex-wrap items-center justify-between gap-3 text-emerald-400">
                <span>Discount ({appliedCoupon.code})</span>
                <span>−{formatCurrency(appliedCoupon.discount)}</span>
              </div>
            )}
            <div className="border-t border-white/10 pt-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="text-sm uppercase tracking-[0.2em] text-white/60">Total</span>
                <span className="text-3xl font-semibold tracking-[-0.05em]">
                  {formatCurrency(discountedTotal)}
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handlePayment}
            disabled={isSubmitting}
            className={buttonStyles({
              size: "lg",
              className: "mt-6 w-full bg-white text-brand-900 hover:bg-sand-100",
            })}
          >
            {isSubmitting ? "Processing..." : `Pay ${formatCurrency(discountedTotal)}`}
          </button>

          <p className="mt-4 text-sm leading-6 text-white/68">
            Use Razorpay test credentials for development payments. No real charge is created in test
            mode.
          </p>
        </div>

        <Link href="/cart" className={buttonStyles({ variant: "secondary", size: "lg", className: "w-full" })}>
          Back to cart
        </Link>
      </aside>
    </div>
  );
}
