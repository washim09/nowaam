"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { buttonStyles } from "@/components/Button";
import { useToast } from "@/components/ToastProvider";
import { useAddresses, type SavedAddress } from "@/hooks/use-addresses";
import { useCart } from "@/hooks/use-cart";
import { useNotificationPrefs, type NotificationPrefs } from "@/hooks/use-notification-prefs";
import { useOrderHistory } from "@/hooks/use-order-history";
import { useProfile, type BuyerProfile } from "@/hooks/use-profile";
import { useRecentlyViewed } from "@/hooks/use-recently-viewed";
import { useWishlist } from "@/hooks/use-wishlist";
import { LOCATIONS } from "@/lib/constants";
import { cn, formatCurrency } from "@/lib/utils";
import type { FulfillmentStatus, OrderRecord, ProductRecord, ReviewRecord } from "@/types";

type Tab = "profile" | "orders" | "tracking" | "wishlist" | "recent" | "addresses" | "notifications" | "reviews";

const TABS: Array<{ id: Tab; label: string }> = [
  { id: "profile", label: "Profile" },
  { id: "orders", label: "Orders" },
  { id: "tracking", label: "Tracking" },
  { id: "wishlist", label: "Wishlist" },
  { id: "recent", label: "Recently Viewed" },
  { id: "addresses", label: "Addresses" },
  { id: "notifications", label: "Notifications" },
  { id: "reviews", label: "Reviews" },
];

const TRACKING_STEPS = [
  { key: "placed", label: "Order Placed", description: "Your order has been received." },
  { key: "confirmed", label: "Payment Confirmed", description: "Payment successfully verified." },
  { key: "processing", label: "Processing", description: "Your order is being prepared." },
  { key: "shipped", label: "Shipped", description: "Your order is on its way." },
  { key: "delivered", label: "Delivered", description: "Order delivered successfully." },
];

function getCompletedStepCount(paymentStatus: string, fulfillmentStatus?: string) {
  if (paymentStatus === "failed") return -1;
  if (fulfillmentStatus === "cancelled") return -2;
  if (paymentStatus === "created") return 1;
  if (paymentStatus === "paid") {
    if (fulfillmentStatus === "delivered") return 5;
    if (fulfillmentStatus === "shipped") return 4;
    return 3;
  }
  return 1;
}

function FulfillmentBadge({ status }: { status?: FulfillmentStatus }) {
  if (!status) return null;
  const styles: Record<FulfillmentStatus, string> = {
    pending: "bg-brand-50 text-brand-700",
    processing: "bg-amber-50 text-amber-700",
    shipped: "bg-sky-50 text-sky-700",
    delivered: "bg-emerald-50 text-emerald-700",
    cancelled: "bg-stone-100 text-stone-600",
    refund_requested: "bg-rose-50 text-rose-700",
  };
  return (
    <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em]", styles[status])}>
      {status.replace("_", " ")}
    </span>
  );
}

function formatOrderDate(dateString?: string) {
  if (!dateString) return "—";
  return new Date(dateString).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function StatusBadge({ status }: { status: string }) {
  const styles =
    status === "paid"
      ? "bg-emerald-50 text-emerald-700"
      : status === "failed"
        ? "bg-rose-50 text-rose-700"
        : "bg-brand-50 text-brand-700";
  return (
    <span
      className={cn(
        "rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]",
        styles,
      )}
    >
      {status}
    </span>
  );
}

function ProfileSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_0.85fr]">
      <div className="surface-elevated p-6 sm:p-8">
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
          <div className="shimmer h-20 w-20 rounded-[28px] bg-brand-100" />
          <div className="space-y-3">
            <div className="shimmer h-5 w-40 rounded-full bg-brand-100" />
            <div className="shimmer h-4 w-28 rounded-full bg-brand-100" />
          </div>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="shimmer h-14 rounded-2xl bg-brand-100" />
          ))}
        </div>
      </div>
      <div className="surface-dark h-60 p-6">
        <div className="shimmer h-4 w-28 rounded-full bg-white/20" />
      </div>
    </div>
  );
}

function OrdersSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 2 }).map((_, i) => (
        <div key={i} className="surface-elevated p-5">
          <div className="shimmer mb-4 h-5 w-48 rounded-full bg-brand-100" />
          <div className="shimmer h-20 rounded-[22px] bg-brand-100" />
        </div>
      ))}
    </div>
  );
}

function ProfileTab() {
  const { profile, isHydrated, saveProfile } = useProfile();
  const { toast } = useToast();
  const [form, setForm] = useState<BuyerProfile>({
    fullName: "",
    email: "",
    phone: "",
    preferredCity: "",
  });

  useEffect(() => {
    if (isHydrated) setForm(profile);
  }, [isHydrated, profile]);

  const handleSave = (event: React.FormEvent) => {
    event.preventDefault();
    saveProfile(form);
    toast({
      variant: "success",
      title: "Profile saved",
      description: "Your details have been updated.",
    });
  };

  if (!isHydrated) return <ProfileSkeleton />;

  const initials = form.fullName
    ? form.fullName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_0.85fr]">
      <form onSubmit={handleSave} className="surface-elevated space-y-6 p-6 sm:p-8">
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
          <div className="grid h-20 w-20 flex-shrink-0 place-items-center rounded-[28px] bg-brand-700 text-xl font-semibold text-white">
            {initials}
          </div>
          <div>
            <p className="text-xl font-semibold tracking-[-0.03em] text-brand-900">
              {form.fullName || "Your name"}
            </p>
            <p className="mt-1 text-sm text-stone-500">{form.email || "your@email.com"}</p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-2 sm:col-span-2">
            <span className="text-xs font-semibold uppercase tracking-[0.22em] text-brand-500">
              Full name
            </span>
            <input
              value={form.fullName}
              onChange={(e) => setForm((c) => ({ ...c, fullName: e.target.value }))}
              className="input-shell"
              placeholder="Rohan Sharma"
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.22em] text-brand-500">
              Email
            </span>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm((c) => ({ ...c, email: e.target.value }))}
              className="input-shell"
              placeholder="rohan@example.com"
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.22em] text-brand-500">
              Phone
            </span>
            <input
              value={form.phone}
              onChange={(e) => setForm((c) => ({ ...c, phone: e.target.value }))}
              className="input-shell"
              placeholder="+91 98765 43210"
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.22em] text-brand-500">
              Preferred city
            </span>
            <select
              value={form.preferredCity}
              onChange={(e) => setForm((c) => ({ ...c, preferredCity: e.target.value }))}
              className="input-shell"
            >
              <option value="">Select city</option>
              {LOCATIONS.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>
          </label>
        </div>

        <button type="submit" className={buttonStyles({ size: "lg" })}>
          Save profile
        </button>
      </form>

      <div className="surface-dark p-6">
        <p className="text-[11px] uppercase tracking-[0.22em] text-white/60">Account info</p>
        <h3 className="mt-4 text-3xl font-semibold tracking-[-0.05em]">Your details</h3>
        <div className="mt-5 space-y-3 text-sm leading-6 text-white/72">
          <p>
            Profile data is stored locally on your device and used to pre-fill checkout details.
          </p>
          <p>Your preferred city sets the default location filter when browsing products.</p>
          <p>No account registration is required to shop on Nowaam Marketplace.</p>
        </div>
      </div>
    </div>
  );
}

function OrdersTab() {
  const { orders, isLoading, isHydrated } = useOrderHistory();
  const { toast } = useToast();
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [localOrders, setLocalOrders] = useState<OrderRecord[]>([]);

  useEffect(() => { setLocalOrders(orders); }, [orders]);

  const updateFulfillment = async (orderId: string, fulfillmentStatus: FulfillmentStatus) => {
    setUpdatingId(orderId);
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fulfillmentStatus }),
      });
      const data = (await res.json()) as { error?: string; order?: OrderRecord };
      if (!res.ok) throw new Error(data.error);
      setLocalOrders((prev) => prev.map((o) => (o._id === orderId ? data.order! : o)));
      toast({ variant: "success", title: fulfillmentStatus === "cancelled" ? "Order cancelled" : "Refund requested",
        description: fulfillmentStatus === "cancelled" ? "Your order has been cancelled." : "A refund request has been submitted." });
    } catch (e) {
      toast({ variant: "error", title: "Action failed", description: e instanceof Error ? e.message : "Something went wrong." });
    } finally {
      setUpdatingId(null);
    }
  };

  if (!isHydrated || isLoading) return <OrdersSkeleton />;

  if (orders.length === 0) {
    return (
      <div className="surface-elevated p-10 text-center">
        <h3 className="text-3xl font-semibold tracking-[-0.04em] text-brand-900">No orders yet</h3>
        <p className="mt-3 text-sm leading-6 text-stone-500">
          Orders placed through this browser will appear here after checkout.
        </p>
        <Link href="/products" className={buttonStyles({ size: "lg", className: "mt-6" })}>
          Browse products
        </Link>
      </div>
    );
  }

  const displayOrders = localOrders.length > 0 ? localOrders : orders;

  return (
    <div className="space-y-4">
      {displayOrders.map((order) => (
        <article key={order._id} className="surface-elevated overflow-hidden p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-brand-500">Order ID</p>
              <p className="mt-1 truncate font-mono text-sm font-semibold text-brand-900">
                {order._id}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={order.paymentStatus} />
              <FulfillmentBadge status={order.fulfillmentStatus} />
              <span className="text-sm text-stone-500">{formatOrderDate(order.createdAt)}</span>
            </div>
          </div>

          {order.items?.length > 0 && (
            <div className="mt-4 space-y-2">
              {order.items.map((item, index) => (
                <div key={index} className="flex gap-3 rounded-[20px] bg-brand-50/60 p-3">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="h-16 w-16 flex-shrink-0 rounded-[16px] object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="truncate font-semibold text-brand-900">{item.name}</p>
                    <p className="mt-1 text-sm text-stone-500">
                      {item.quantity} × {formatCurrency(item.unitPrice)} ={" "}
                      {formatCurrency(item.totalPrice)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-brand-100/60 pt-4">
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-sm text-stone-500">{order.userLocation}</p>
              <p className="text-2xl font-semibold tracking-[-0.04em] text-brand-900">
                {formatCurrency(order.totalAmount)}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {order.paymentStatus === "paid" && (
                <Link
                  href={`/invoice/${order._id}`}
                  target="_blank"
                  className={buttonStyles({ variant: "secondary", size: "sm" })}
                >
                  Invoice
                </Link>
              )}
              {order.paymentStatus === "created" &&
                order.fulfillmentStatus !== "cancelled" && (
                  <button
                    type="button"
                    disabled={updatingId === order._id}
                    onClick={() => updateFulfillment(order._id, "cancelled")}
                    className="rounded-full bg-stone-100 px-3 py-2 text-sm font-semibold text-stone-600 transition-all duration-300 hover:bg-stone-200"
                  >
                    {updatingId === order._id ? "Cancelling…" : "Cancel order"}
                  </button>
              )}
              {order.paymentStatus === "paid" &&
                !order.fulfillmentStatus && (
                  <button
                    type="button"
                    disabled={updatingId === order._id}
                    onClick={() => updateFulfillment(order._id, "refund_requested")}
                    className="rounded-full bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-600 transition-all duration-300 hover:bg-rose-100"
                  >
                    {updatingId === order._id ? "Requesting…" : "Request refund"}
                  </button>
              )}
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

function TrackingTab() {
  const { orders, isLoading, isHydrated } = useOrderHistory();
  const [selectedOrderId, setSelectedOrderId] = useState<string>("");

  useEffect(() => {
    if (orders.length > 0 && !selectedOrderId) {
      setSelectedOrderId(orders[0]._id);
    }
  }, [orders, selectedOrderId]);

  if (!isHydrated || isLoading) return <OrdersSkeleton />;

  if (orders.length === 0) {
    return (
      <div className="surface-elevated p-10 text-center">
        <h3 className="text-3xl font-semibold tracking-[-0.04em] text-brand-900">
          Nothing to track
        </h3>
        <p className="mt-3 text-sm leading-6 text-stone-500">
          Place an order to start tracking its delivery status.
        </p>
        <Link href="/products" className={buttonStyles({ size: "lg", className: "mt-6" })}>
          Shop now
        </Link>
      </div>
    );
  }

  const selectedOrder: OrderRecord =
    orders.find((o) => o._id === selectedOrderId) ?? orders[0];
  const completedSteps = getCompletedStepCount(selectedOrder.paymentStatus, selectedOrder.fulfillmentStatus);

  return (
    <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
      <div className="surface-elevated p-5">
        <p className="text-[11px] uppercase tracking-[0.18em] text-brand-500">Select order</p>
        <div className="mt-4 space-y-2">
          {orders.map((order) => {
            const isSelected = selectedOrderId === order._id || (!selectedOrderId && order === orders[0]);
            return (
              <button
                key={order._id}
                type="button"
                onClick={() => setSelectedOrderId(order._id)}
                className={cn(
                  "w-full rounded-[22px] p-4 text-left transition-all duration-300",
                  isSelected
                    ? "bg-brand-700 text-white"
                    : "bg-brand-50/70 text-brand-900 hover:bg-brand-100/70",
                )}
              >
                <p className="truncate font-mono text-xs">{order._id}</p>
                <div className="mt-1 flex items-center justify-between gap-2">
                  <p className={cn("text-sm font-semibold", isSelected ? "text-white/80" : "text-stone-500")}>
                    {formatCurrency(order.totalAmount)}
                  </p>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em]",
                      isSelected
                        ? "bg-white/15 text-white"
                        : order.paymentStatus === "paid"
                          ? "bg-emerald-50 text-emerald-700"
                          : order.paymentStatus === "failed"
                            ? "bg-rose-50 text-rose-700"
                            : "bg-brand-50 text-brand-700",
                    )}
                  >
                    {order.paymentStatus}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="surface-elevated p-6 sm:p-8">
        <p className="text-[11px] uppercase tracking-[0.18em] text-brand-500">Tracking status</p>
        <h3 className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-brand-900">
          {completedSteps === -1 ? "Order failed" : completedSteps === -2 ? "Order cancelled" : "Order progress"}
        </h3>
        <p className="mt-1 text-sm text-stone-500">{formatOrderDate(selectedOrder.createdAt)}</p>

        {completedSteps === -1 ? (
          <div className="mt-6 rounded-[22px] bg-rose-50 p-5">
            <p className="font-semibold text-rose-700">Payment failed</p>
            <p className="mt-1 text-sm text-rose-600">
              The payment for this order was not completed or was declined. Please try again.
            </p>
            <Link href="/checkout" className={buttonStyles({ size: "sm", className: "mt-4 bg-rose-600 text-white hover:bg-rose-700" })}>
              Try again
            </Link>
          </div>
        ) : completedSteps === -2 ? (
          <div className="mt-6 rounded-[22px] bg-stone-100 p-5">
            <p className="font-semibold text-stone-700">Order cancelled</p>
            <p className="mt-1 text-sm text-stone-500">
              This order was cancelled before payment was completed.
            </p>
          </div>
        ) : (
          <div className="mt-8">
            {TRACKING_STEPS.map((step, index) => {
              const isCompleted = index < completedSteps;
              const isActive = index === completedSteps;
              const isUpcoming = index > completedSteps;
              const isLast = index === TRACKING_STEPS.length - 1;

              return (
                <div key={step.key} className="relative flex gap-4">
                  {!isLast && (
                    <div
                      className={cn(
                        "absolute left-5 top-10 z-0 w-0.5",
                        isCompleted ? "bg-brand-700" : "bg-brand-100",
                      )}
                      style={{ height: "calc(100% - 0px)" }}
                    />
                  )}

                  <div
                    className={cn(
                      "relative z-10 mt-0.5 grid h-10 w-10 flex-shrink-0 place-items-center rounded-full border-2 transition-all",
                      isCompleted
                        ? "border-brand-700 bg-brand-700 text-white"
                        : isActive
                          ? "border-brand-500 bg-white text-brand-700 shadow-sm"
                          : "border-brand-100 bg-white text-stone-400",
                    )}
                  >
                    {isCompleted ? (
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path
                          d="M2 7l4 4 6-8"
                          stroke="currentColor"
                          strokeWidth="2.2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    ) : (
                      <span className="text-xs font-semibold">{index + 1}</span>
                    )}
                  </div>

                  <div className={cn("pb-8 pt-0.5", isUpcoming && "opacity-40")}>
                    <div className="flex items-center gap-2">
                      <p
                        className={cn(
                          "font-semibold",
                          isActive ? "text-brand-700" : "text-brand-900",
                        )}
                      >
                        {step.label}
                      </p>
                      {isActive && (
                        <span className="inline-flex rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-700">
                          Current
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-sm text-stone-500">{step.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function WishlistTab() {
  const { wishlist, toggle } = useWishlist();
  const { addItem } = useCart();
  const { toast } = useToast();
  const [products, setProducts] = useState<ProductRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (wishlist.length === 0) {
      setProducts([]);
      return;
    }

    setIsLoading(true);

    Promise.all(
      wishlist.map((id) =>
        fetch(`/api/products/${id}`)
          .then((res) => res.json())
          .then((data: { product?: ProductRecord }) => data.product ?? null)
          .catch(() => null),
      ),
    )
      .then((results) => setProducts(results.filter(Boolean) as ProductRecord[]))
      .finally(() => setIsLoading(false));
  }, [wishlist]);

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="surface-elevated p-3">
            <div className="shimmer h-48 rounded-[24px] bg-brand-100" />
            <div className="mt-4 space-y-3 p-2">
              <div className="shimmer h-4 w-3/4 rounded-full bg-brand-100" />
              <div className="shimmer h-4 w-1/2 rounded-full bg-brand-100" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (wishlist.length === 0) {
    return (
      <div className="surface-elevated p-10 text-center">
        <h3 className="text-3xl font-semibold tracking-[-0.04em] text-brand-900">
          Wishlist is empty
        </h3>
        <p className="mt-3 text-sm leading-6 text-stone-500">
          Save products you love by tapping the wishlist icon on any product page.
        </p>
        <Link href="/products" className={buttonStyles({ size: "lg", className: "mt-6" })}>
          Explore products
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {products.map((product) => (
        <article key={product._id} className="surface-elevated overflow-hidden p-3">
          <Link href={`/products/${product._id}`} className="block">
            <div className="overflow-hidden rounded-[24px] bg-brand-100">
              <img
                src={product.image}
                alt={product.name}
                className="h-48 w-full object-cover transition-transform duration-500 hover:scale-105"
              />
            </div>
          </Link>
          <div className="space-y-4 p-2 pt-4">
            <div>
              <h4 className="text-lg font-semibold tracking-[-0.03em] text-brand-900">
                {product.name}
              </h4>
              <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-brand-500">
                {product.location}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 rounded-[22px] bg-white/70 p-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.18em] text-brand-500">Retail</p>
                <p className="mt-1 font-semibold text-brand-900">{formatCurrency(product.price)}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.18em] text-brand-500">Bulk</p>
                <p className="mt-1 font-semibold text-brand-700">
                  {formatCurrency(product.bulkPrice)}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  addItem(product, 1);
                  toast({
                    variant: "success",
                    title: "Added to cart",
                    description: `${product.name} added to your cart.`,
                  });
                }}
                className={buttonStyles({ size: "sm", className: "flex-1" })}
              >
                Add to cart
              </button>
              <button
                type="button"
                onClick={() => {
                  toggle(product._id);
                  toast({
                    variant: "info",
                    title: "Removed from wishlist",
                    description: `${product.name} has been removed.`,
                  });
                }}
                className="rounded-full bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-600 transition-all duration-300 hover:bg-rose-100"
              >
                Remove
              </button>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

const emptyAddressForm = {
  label: "",
  fullName: "",
  phone: "",
  addressLine: "",
  area: "",
  city: "",
  pincode: "",
};

function AddressesTab() {
  const { addresses, isHydrated, addAddress, removeAddress } = useAddresses();
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyAddressForm);

  if (!isHydrated) {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="surface-elevated p-5">
            <div className="shimmer mb-3 h-4 w-16 rounded-full bg-brand-100" />
            <div className="shimmer mb-2 h-5 w-36 rounded-full bg-brand-100" />
            <div className="shimmer h-4 w-full rounded-full bg-brand-100" />
          </div>
        ))}
      </div>
    );
  }

  const handleSave = (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.fullName.trim() || !form.addressLine.trim() || !form.city.trim()) {
      toast({
        variant: "error",
        title: "Missing details",
        description: "Name, address line, and city are required.",
      });
      return;
    }
    addAddress(form);
    setForm(emptyAddressForm);
    setShowForm(false);
    toast({ variant: "success", title: "Address saved", description: "Delivery address stored." });
  };

  return (
    <div className="space-y-4">
      {addresses.length === 0 && !showForm && (
        <div className="surface-elevated p-10 text-center">
          <h3 className="text-3xl font-semibold tracking-[-0.04em] text-brand-900">
            No saved addresses
          </h3>
          <p className="mt-3 text-sm leading-6 text-stone-500">
            Save delivery addresses to speed up your checkout experience.
          </p>
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className={buttonStyles({ size: "lg", className: "mt-6" })}
          >
            Add address
          </button>
        </div>
      )}

      {addresses.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          {addresses.map((address: SavedAddress) => (
            <div key={address.id} className="surface-elevated p-5">
              {address.label && (
                <span className="eyebrow mb-3 inline-flex">{address.label}</span>
              )}
              <p className="font-semibold text-brand-900">{address.fullName}</p>
              {address.phone && <p className="mt-1 text-sm text-stone-500">{address.phone}</p>}
              <p className="mt-2 text-sm leading-6 text-stone-600">
                {[address.addressLine, address.area, address.city, address.pincode]
                  .filter(Boolean)
                  .join(", ")}
              </p>
              <button
                type="button"
                onClick={() => {
                  removeAddress(address.id);
                  toast({ variant: "info", title: "Address removed" });
                }}
                className="mt-4 rounded-full bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-600 transition-all duration-300 hover:bg-rose-100"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}

      {addresses.length > 0 && !showForm && (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className={buttonStyles({ variant: "secondary", size: "md" })}
        >
          Add new address
        </button>
      )}

      {showForm && (
        <form onSubmit={handleSave} className="surface-elevated space-y-5 p-6 sm:p-8">
          <h3 className="text-2xl font-semibold tracking-[-0.04em] text-brand-900">
            New delivery address
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-2 sm:col-span-2">
              <span className="text-xs font-semibold uppercase tracking-[0.22em] text-brand-500">
                Label (optional)
              </span>
              <input
                value={form.label}
                onChange={(e) => setForm((c) => ({ ...c, label: e.target.value }))}
                className="input-shell"
                placeholder="Home, Work, Parents…"
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.22em] text-brand-500">
                Full name
              </span>
              <input
                value={form.fullName}
                onChange={(e) => setForm((c) => ({ ...c, fullName: e.target.value }))}
                className="input-shell"
                placeholder="Rohan Sharma"
                required
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.22em] text-brand-500">
                Phone
              </span>
              <input
                value={form.phone}
                onChange={(e) => setForm((c) => ({ ...c, phone: e.target.value }))}
                className="input-shell"
                placeholder="+91 98765 43210"
              />
            </label>

            <label className="flex flex-col gap-2 sm:col-span-2">
              <span className="text-xs font-semibold uppercase tracking-[0.22em] text-brand-500">
                Address line
              </span>
              <input
                value={form.addressLine}
                onChange={(e) => setForm((c) => ({ ...c, addressLine: e.target.value }))}
                className="input-shell"
                placeholder="House number, street, landmark"
                required
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.22em] text-brand-500">
                Area
              </span>
              <input
                value={form.area}
                onChange={(e) => setForm((c) => ({ ...c, area: e.target.value }))}
                className="input-shell"
                placeholder="South Extension"
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.22em] text-brand-500">
                City
              </span>
              <input
                value={form.city}
                onChange={(e) => setForm((c) => ({ ...c, city: e.target.value }))}
                className="input-shell"
                placeholder="Delhi"
                required
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.22em] text-brand-500">
                Pincode
              </span>
              <input
                value={form.pincode}
                onChange={(e) => setForm((c) => ({ ...c, pincode: e.target.value }))}
                className="input-shell"
                placeholder="110001"
              />
            </label>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button type="submit" className={buttonStyles({ size: "lg" })}>
              Save address
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setForm(emptyAddressForm);
              }}
              className={buttonStyles({ variant: "secondary", size: "lg" })}
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

function RecentlyViewedTab() {
  const { ids, isHydrated, clear } = useRecentlyViewed();
  const { addItem } = useCart();
  const { toast } = useToast();
  const [products, setProducts] = useState<ProductRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isHydrated) return;
    if (ids.length === 0) {
      setProducts([]);
      return;
    }
    setIsLoading(true);
    Promise.all(
      ids.map((id) =>
        fetch(`/api/products/${id}`)
          .then((res) => res.json())
          .then((data: { product?: ProductRecord }) => data.product ?? null)
          .catch(() => null),
      ),
    )
      .then((results) => setProducts(results.filter(Boolean) as ProductRecord[]))
      .finally(() => setIsLoading(false));
  }, [isHydrated, ids]);

  if (!isHydrated || isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="surface-elevated p-3">
            <div className="shimmer h-48 rounded-[24px] bg-brand-100" />
            <div className="mt-4 space-y-3 p-2">
              <div className="shimmer h-4 w-3/4 rounded-full bg-brand-100" />
              <div className="shimmer h-4 w-1/2 rounded-full bg-brand-100" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (ids.length === 0) {
    return (
      <div className="surface-elevated p-10 text-center">
        <h3 className="text-3xl font-semibold tracking-[-0.04em] text-brand-900">
          No browsing history
        </h3>
        <p className="mt-3 text-sm leading-6 text-stone-500">
          Products you open will appear here automatically for quick re-access.
        </p>
        <Link href="/products" className={buttonStyles({ size: "lg", className: "mt-6" })}>
          Browse products
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-stone-500">{products.length} product{products.length !== 1 ? "s" : ""} viewed recently</p>
        <button
          type="button"
          onClick={clear}
          className="rounded-full bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-600 transition-all duration-300 hover:bg-rose-100"
        >
          Clear history
        </button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {products.map((product) => (
          <article key={product._id} className="surface-elevated overflow-hidden p-3">
            <Link href={`/products/${product._id}`} className="block">
              <div className="overflow-hidden rounded-[24px] bg-brand-100">
                <img
                  src={product.image}
                  alt={product.name}
                  className="h-48 w-full object-cover transition-transform duration-500 hover:scale-105"
                />
              </div>
            </Link>
            <div className="space-y-4 p-2 pt-4">
              <div>
                <h4 className="text-lg font-semibold tracking-[-0.03em] text-brand-900">
                  {product.name}
                </h4>
                <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-brand-500">
                  {product.location}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 rounded-[22px] bg-white/70 p-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.18em] text-brand-500">Retail</p>
                  <p className="mt-1 font-semibold text-brand-900">{formatCurrency(product.price)}</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.18em] text-brand-500">Bulk</p>
                  <p className="mt-1 font-semibold text-brand-700">
                    {formatCurrency(product.bulkPrice)}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    addItem(product, 1);
                    toast({
                      variant: "success",
                      title: "Added to cart",
                      description: `${product.name} added to your cart.`,
                    });
                  }}
                  className={buttonStyles({ size: "sm", className: "flex-1" })}
                >
                  Add to cart
                </button>
                <Link
                  href={`/products/${product._id}`}
                  className={buttonStyles({ variant: "secondary", size: "sm" })}
                >
                  View
                </Link>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

type NotifRow = {
  key: keyof NotificationPrefs;
  label: string;
  description: string;
};

const EMAIL_ROWS: NotifRow[] = [
  {
    key: "emailOrderConfirmation",
    label: "Order confirmation",
    description: "Receive a confirmation when your order is successfully placed.",
  },
  {
    key: "emailStatusUpdates",
    label: "Order status updates",
    description: "Get notified when your order status changes to paid, shipped, or delivered.",
  },
  {
    key: "emailPromos",
    label: "Promotional offers",
    description: "Occasional emails about new products, bulk deals, and marketplace events.",
  },
];

const SMS_ROWS: NotifRow[] = [
  {
    key: "smsOrderConfirmation",
    label: "Order confirmation",
    description: "Receive an SMS when your order is confirmed.",
  },
  {
    key: "smsDeliveryUpdates",
    label: "Delivery updates",
    description: "SMS alerts when your order is out for delivery.",
  },
  {
    key: "smsShippingAlerts",
    label: "Shipping alerts",
    description: "Notifications when your order is dispatched.",
  },
];

function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:cursor-not-allowed disabled:opacity-50",
        checked ? "bg-brand-700" : "bg-stone-200",
      )}
    >
      <span
        className={cn(
          "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition-transform duration-300",
          checked ? "translate-x-5" : "translate-x-0",
        )}
      />
    </button>
  );
}

function NotificationsTab() {
  const { prefs, isHydrated, updatePref } = useNotificationPrefs();
  const { toast } = useToast();

  const handleChange = (
    key: keyof NotificationPrefs,
    value: boolean,
  ) => {
    updatePref(key, value);
    toast({
      variant: "success",
      title: value ? "Notification enabled" : "Notification disabled",
      description: "Your preferences have been saved.",
    });
  };

  if (!isHydrated) {
    return (
      <div className="grid gap-6 lg:grid-cols-2">
        {[0, 1].map((i) => (
          <div key={i} className="surface-elevated p-6 sm:p-8">
            <div className="shimmer mb-6 h-5 w-24 rounded-full bg-brand-100" />
            {Array.from({ length: 3 }).map((_, j) => (
              <div key={j} className="mb-5 flex items-center justify-between gap-4">
                <div className="space-y-2">
                  <div className="shimmer h-4 w-36 rounded-full bg-brand-100" />
                  <div className="shimmer h-3 w-52 rounded-full bg-brand-100" />
                </div>
                <div className="shimmer h-6 w-11 rounded-full bg-brand-100" />
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="surface-elevated p-6 sm:p-8">
        <div className="mb-6 flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-full bg-brand-50">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-brand-700">
              <path
                d="M2 4h12v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V4Zm0 0 1.5-2h9L14 4M6 8h4"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div>
            <p className="font-semibold tracking-[-0.02em] text-brand-900">Email notifications</p>
            <p className="text-xs text-stone-500">Requires email in your profile</p>
          </div>
        </div>
        <div className="divide-y divide-brand-100/60">
          {EMAIL_ROWS.map((row) => (
            <div key={row.key} className="flex flex-col gap-4 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="font-semibold text-brand-900">{row.label}</p>
                <p className="mt-0.5 text-sm leading-5 text-stone-500">{row.description}</p>
              </div>
              <Toggle
                checked={prefs[row.key]}
                onChange={(v) => handleChange(row.key, v)}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="surface-elevated p-6 sm:p-8">
        <div className="mb-6 flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-full bg-brand-50">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-brand-700">
              <rect
                x="4"
                y="1"
                width="8"
                height="14"
                rx="2"
                stroke="currentColor"
                strokeWidth="1.4"
              />
              <circle cx="8" cy="12" r="0.8" fill="currentColor" />
            </svg>
          </div>
          <div>
            <p className="font-semibold tracking-[-0.02em] text-brand-900">SMS notifications</p>
            <p className="text-xs text-stone-500">Requires phone number in your profile</p>
          </div>
        </div>
        <div className="divide-y divide-brand-100/60">
          {SMS_ROWS.map((row) => (
            <div key={row.key} className="flex flex-col gap-4 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="font-semibold text-brand-900">{row.label}</p>
                <p className="mt-0.5 text-sm leading-5 text-stone-500">{row.description}</p>
              </div>
              <Toggle
                checked={prefs[row.key]}
                onChange={(v) => handleChange(row.key, v)}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="surface-dark p-6 lg:col-span-2">
        <p className="text-[11px] uppercase tracking-[0.22em] text-white/60">About notifications</p>
        <h3 className="mt-3 text-2xl font-semibold tracking-[-0.04em]">How it works</h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-3 text-sm leading-6 text-white/72">
          <p>Preferences are stored locally on your device and will take effect when real notification infrastructure is integrated.</p>
          <p>Email notifications require a valid email address saved in your Profile tab.</p>
          <p>SMS notifications require a phone number saved in your Profile tab. Standard messaging rates may apply.</p>
        </div>
      </div>
    </div>
  );
}

function StarRating({ value, onChange }: { value: number; onChange?: (v: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type={onChange ? "button" : "button"}
          onClick={() => onChange?.(star)}
          className={cn(
            "text-2xl leading-none transition-transform duration-150",
            onChange ? "cursor-pointer hover:scale-110" : "cursor-default",
            star <= value ? "text-amber-400" : "text-stone-200",
          )}
        >
          ★
        </button>
      ))}
    </div>
  );
}

function ReviewsTab() {
  const { orders, isHydrated, isLoading } = useOrderHistory();
  const { profile } = useProfile();
  const { toast } = useToast();
  const [existingReviews, setExistingReviews] = useState<ReviewRecord[]>([]);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [forms, setForms] = useState<Record<string, { rating: number; comment: string; buyerName: string }>>({});

  const paidOrders = orders.filter((o) => o.paymentStatus === "paid");

  useEffect(() => {
    if (!isHydrated || paidOrders.length === 0) return;
    const orderIds = paidOrders.map((o) => o._id).join(",");
    fetch(`/api/reviews?orderIds=${orderIds}`)
      .then((r) => r.json())
      .then((data: { reviews?: ReviewRecord[] }) => {
        if (data.reviews) setExistingReviews(data.reviews);
      })
      .catch(() => null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHydrated, orders.length]);

  if (!isHydrated || isLoading) return (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="surface-elevated p-5">
          <div className="shimmer mb-3 h-4 w-48 rounded-full bg-brand-100" />
          <div className="shimmer h-20 rounded-[20px] bg-brand-100" />
        </div>
      ))}
    </div>
  );

  if (paidOrders.length === 0) {
    return (
      <div className="surface-elevated p-10 text-center">
        <h3 className="text-3xl font-semibold tracking-[-0.04em] text-brand-900">No purchases yet</h3>
        <p className="mt-3 text-sm leading-6 text-stone-500">
          Reviews can be submitted after completing a paid order.
        </p>
        <Link href="/products" className={buttonStyles({ size: "lg", className: "mt-6" })}>
          Browse products
        </Link>
      </div>
    );
  }

  const reviewedKey = (orderId: string, productId: string) =>
    existingReviews.some((r) => r.orderId === orderId && r.productId === productId);

  const getForm = (key: string) =>
    forms[key] ?? { rating: 5, comment: "", buyerName: profile.fullName };

  const setForm = (key: string, patch: Partial<{ rating: number; comment: string; buyerName: string }>) =>
    setForms((prev) => ({ ...prev, [key]: { ...getForm(key), ...patch } }));

  const submitReview = async (orderId: string, productId: string) => {
    const key = `${orderId}-${productId}`;
    const form = getForm(key);
    if (!form.comment.trim()) {
      toast({ variant: "error", title: "Comment required", description: "Please write a short review." });
      return;
    }
    setSubmitting(key);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, orderId, rating: form.rating, comment: form.comment.trim(), buyerName: form.buyerName || "Anonymous" }),
      });
      const data = (await res.json()) as { error?: string; review?: ReviewRecord };
      if (!res.ok) throw new Error(data.error);
      setExistingReviews((prev) => [...prev, data.review!]);
      toast({ variant: "success", title: "Review submitted", description: "Thank you for your feedback!" });
    } catch (e) {
      toast({ variant: "error", title: "Submission failed", description: e instanceof Error ? e.message : "Something went wrong." });
    } finally {
      setSubmitting(null);
    }
  };

  return (
    <div className="space-y-6">
      {paidOrders.map((order) =>
        order.items?.map((item) => {
          const key = `${order._id}-${item.productId}`;
          const alreadyReviewed = reviewedKey(order._id, item.productId);
          const existingReview = existingReviews.find(
            (r) => r.orderId === order._id && r.productId === item.productId,
          );
          const form = getForm(key);

          return (
            <div key={key} className="surface-elevated overflow-hidden p-5">
              <div className="flex flex-col gap-4 sm:flex-row">
                <img src={item.image} alt={item.name} className="h-16 w-16 flex-shrink-0 rounded-[18px] object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-brand-900">{item.name}</p>
                  <p className="mt-0.5 text-sm text-stone-500">{item.quantity} unit{item.quantity !== 1 ? "s" : ""} · {formatCurrency(item.totalPrice)}</p>
                  <p className="mt-0.5 font-mono text-[11px] text-brand-300">{order._id}</p>
                </div>
              </div>

              {alreadyReviewed && existingReview ? (
                <div className="mt-4 rounded-[20px] bg-emerald-50 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <StarRating value={existingReview.rating} />
                    <span className="text-xs text-stone-500">{formatOrderDate(existingReview.createdAt)}</span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-stone-700">{existingReview.comment}</p>
                  <p className="mt-1 text-[11px] text-stone-400">by {existingReview.buyerName}</p>
                </div>
              ) : (
                <div className="mt-4 space-y-3 rounded-[20px] bg-brand-50/60 p-4">
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-brand-500">Your rating</p>
                    <StarRating value={form.rating} onChange={(v) => setForm(key, { rating: v })} />
                  </div>
                  <label className="flex flex-col gap-1.5">
                    <span className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-500">Name</span>
                    <input
                      value={form.buyerName}
                      onChange={(e) => setForm(key, { buyerName: e.target.value })}
                      placeholder="Your name"
                      className="input-shell"
                    />
                  </label>
                  <label className="flex flex-col gap-1.5">
                    <span className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-500">Review</span>
                    <textarea
                      value={form.comment}
                      onChange={(e) => setForm(key, { comment: e.target.value })}
                      placeholder="Share your experience with this product…"
                      className="input-shell min-h-20 resize-y"
                    />
                  </label>
                  <button
                    type="button"
                    disabled={submitting === key}
                    onClick={() => submitReview(order._id, item.productId)}
                    className={buttonStyles({ size: "sm" })}
                  >
                    {submitting === key ? "Submitting…" : "Submit review"}
                  </button>
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}

export function BuyerAccountClient() {
  const [activeTab, setActiveTab] = useState<Tab>("profile");
  const { orders } = useOrderHistory();
  const { wishlist } = useWishlist();
  const { ids: recentIds } = useRecentlyViewed();

  const tabCounts: Partial<Record<Tab, number>> = {
    orders: orders.length || undefined,
    wishlist: wishlist.length || undefined,
    recent: recentIds.length || undefined,
  };

  return (
    <div className="space-y-6">
      <div className="surface-elevated p-6 sm:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <span className="eyebrow">Buyer account</span>
            <h2 className="mt-4 text-3xl font-semibold tracking-[-0.05em] text-brand-900 sm:text-4xl">
              My account
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-500">
              Manage your profile, track orders, view your wishlist, and save delivery addresses for
              faster checkout.
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-2 sm:grid-cols-2 xl:flex xl:flex-wrap">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "inline-flex w-full items-center justify-center gap-2 rounded-full px-4 py-2 text-center text-sm font-semibold transition-all duration-300 xl:w-auto xl:justify-start",
                activeTab === tab.id
                  ? "bg-brand-700 text-white shadow-sm"
                  : "border border-white/85 bg-white/75 text-brand-700 shadow-sm backdrop-blur hover:bg-white",
              )}
            >
              {tab.label}
              {tabCounts[tab.id] !== undefined && (
                <span
                  className={cn(
                    "inline-flex min-h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-semibold",
                    activeTab === tab.id ? "bg-white/20 text-white" : "bg-brand-100 text-brand-700",
                  )}
                >
                  {tabCounts[tab.id]}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "profile" && <ProfileTab />}
      {activeTab === "orders" && <OrdersTab />}
      {activeTab === "tracking" && <TrackingTab />}
      {activeTab === "wishlist" && <WishlistTab />}
      {activeTab === "recent" && <RecentlyViewedTab />}
      {activeTab === "addresses" && <AddressesTab />}
      {activeTab === "notifications" && <NotificationsTab />}
      {activeTab === "reviews" && <ReviewsTab />}
    </div>
  );
}
