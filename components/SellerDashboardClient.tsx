"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { useEffect, useRef, useState } from "react";

import { buttonStyles } from "@/components/Button";
import { SellerCodRemittanceTab } from "@/components/SellerCodRemittanceTab";
import { SellerNDRTab } from "@/components/SellerNDRTab";
import { SellerReturnsTab } from "@/components/SellerReturnsTab";
import { SellerShipmentsTab } from "@/components/SellerShipmentsTab";
import { useToast } from "@/components/ToastProvider";
import { PRODUCT_CATEGORIES } from "@/lib/constants";
import { getManufacturerName, getProductCategory } from "@/lib/catalog";
import { cn, formatCurrency, getFriendlyErrorMessage } from "@/lib/utils";
import type { FulfillmentStatus, OrderRecord, ProductRecord } from "@/types";

type SellerTab = "listings" | "orders" | "shipments" | "ndr" | "cod" | "returns" | "analytics";

function fulfillmentBadge(status?: FulfillmentStatus) {
  if (!status) return null;
  const styles: Record<FulfillmentStatus, string> = {
    pending: "bg-brand-50 text-brand-700",
    confirmed: "bg-sky-50 text-sky-700",
    processing: "bg-amber-50 text-amber-700",
    packed: "bg-amber-50 text-amber-700",
    shipped: "bg-sky-50 text-sky-700",
    out_for_delivery: "bg-orange-50 text-orange-700",
    delivered: "bg-emerald-50 text-emerald-700",
    cancelled: "bg-stone-100 text-stone-600",
    return_requested: "bg-rose-50 text-rose-700",
    returned: "bg-stone-100 text-stone-600",
    refunded: "bg-indigo-50 text-indigo-700",
    rto: "bg-stone-100 text-stone-600",
    refund_requested: "bg-rose-50 text-rose-700",
  };
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em]",
        styles[status],
      )}
    >
      {status.replace("_", " ")}
    </span>
  );
}

function formatDate(d?: string) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function ListingsTab({
  products,
  isLoading,
  error,
  onRefresh,
  onProductsChange,
}: {
  products: ProductRecord[];
  isLoading: boolean;
  error: string | null;
  onRefresh: () => void;
  onProductsChange: (p: ProductRecord[]) => void;
}) {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [editingProduct, setEditingProduct] = useState<ProductRecord | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editForm, setEditForm] = useState<Partial<ProductRecord>>({});
  const [editImages, setEditImages] = useState<string[]>([]);
  const [isUploadingEdit, setIsUploadingEdit] = useState(false);
  const editFileRef = useRef<HTMLInputElement>(null);

  const openEdit = (product: ProductRecord) => {
    setEditingProduct(product);
    setEditForm({ ...product });
    const imgs = product.images?.length ? product.images : (product.image ? [product.image] : []);
    setEditImages(imgs);
  };

  const handleEditImageUpload = async (file: File) => {
    if (editImages.length >= 5) {
      toast({ variant: "error", title: "Limit reached", description: "You can upload up to 5 images." });
      return;
    }
    setIsUploadingEdit(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) throw new Error(data.error ?? "Upload failed.");
      setEditImages((prev) => [...prev, data.url!]);
      toast({ variant: "success", title: "Image uploaded" });
    } catch (e) {
      toast({ variant: "error", title: "Upload failed", description: getFriendlyErrorMessage(e) });
    } finally {
      setIsUploadingEdit(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingProduct) return;
    setIsSaving(true);
    try {
      const res = await fetch(`/api/products/${editingProduct._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...editForm,
          images: editImages,
          image: editImages[0] ?? editForm.image ?? "",
        }),
      });
      const data = (await res.json()) as { error?: string; product?: ProductRecord };
      if (!res.ok) throw new Error(data.error);
      onProductsChange(products.map((p) => (p._id === editingProduct._id ? data.product! : p)));
      setEditingProduct(null);
      toast({ variant: "success", title: "Product updated", description: `${editForm.name} has been saved.` });
    } catch (e) {
      toast({ variant: "error", title: "Update failed", description: getFriendlyErrorMessage(e) });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/products/${deletingId}`, { method: "DELETE" });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error);
      onProductsChange(products.filter((p) => p._id !== deletingId));
      setDeletingId(null);
      toast({ variant: "success", title: "Product deleted" });
    } catch (e) {
      toast({ variant: "error", title: "Delete failed", description: getFriendlyErrorMessage(e) });
    } finally {
      setIsDeleting(false);
    }
  };

  const filtered = products.filter((p) => {
    const matchSearch =
      !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      getManufacturerName(p).toLowerCase().includes(search.toLowerCase());
    const matchCat = !categoryFilter || getProductCategory(p) === categoryFilter;
    return matchSearch && matchCat;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-wrap gap-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search listings…"
            className="input-shell min-w-0 w-full flex-1 sm:max-w-xs"
          />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="input-shell w-full sm:w-44"
          >
            <option value="">All categories</option>
            {PRODUCT_CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div className="grid w-full grid-cols-2 gap-3 sm:flex sm:w-auto">
          <button type="button" onClick={onRefresh} className={buttonStyles({ variant: "secondary", size: "sm" })}>
            Refresh
          </button>
          <Link href="/seller/add-product" className={buttonStyles({ size: "sm" })}>
            Add product
          </Link>
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="surface-elevated p-3">
              <div className="shimmer h-40 rounded-[24px] bg-brand-100" />
              <div className="mt-4 space-y-3 p-2">
                <div className="shimmer h-4 rounded-full bg-brand-100" />
                <div className="shimmer h-4 w-2/3 rounded-full bg-brand-100" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="surface-elevated p-6 text-sm text-rose-600">{error}</div>
      ) : filtered.length === 0 ? (
        <div className="surface-elevated p-8 text-center text-sm text-stone-500">
          {products.length === 0 ? "No listings yet. Add your first product to start selling." : "No listings match your search."}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((product) => (
            <article key={product._id} className="surface-elevated overflow-hidden p-3">
              <div className="overflow-hidden rounded-[24px] bg-brand-100">
                <img src={product.image} alt={product.name} className="h-44 w-full object-cover" />
              </div>
              <div className="space-y-3 p-2 pt-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h4 className="truncate text-base font-semibold tracking-[-0.03em] text-brand-900">{product.name}</h4>
                    <p className="mt-0.5 text-[11px] uppercase tracking-[0.18em] text-brand-500">{getManufacturerName(product)}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-brand-50 px-2 py-1 text-[10px] font-semibold text-brand-700">
                    {getProductCategory(product)}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 rounded-[20px] bg-white/70 p-3 text-sm">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.18em] text-brand-500">Retail</p>
                    <p className="mt-0.5 font-semibold text-brand-900">{formatCurrency(product.price)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.18em] text-brand-500">Bulk</p>
                    <p className="mt-0.5 font-semibold text-brand-700">{formatCurrency(product.bulkPrice)}</p>
                  </div>
                </div>
                <div className="flex gap-2 pt-1">
                  <button type="button" onClick={() => openEdit(product)} className={buttonStyles({ variant: "secondary", size: "sm", className: "flex-1" })}>Edit</button>
                  <button type="button" onClick={() => setDeletingId(product._id)} className="rounded-full bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-600 transition-all duration-300 hover:bg-rose-100">Delete</button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {editingProduct && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-brand-900/60 p-4 backdrop-blur-sm">
          <div className="surface-elevated my-8 w-full max-w-xl space-y-5 p-6 sm:p-8">
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-semibold tracking-[-0.04em] text-brand-900">Edit product</h3>
              <button type="button" onClick={() => setEditingProduct(null)} className="rounded-full p-2 text-stone-500 hover:bg-brand-50">✕</button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {(["name", "manufacturerName", "description"] as const).map((field) => (
                <label key={field} className={cn("flex flex-col gap-1.5", field === "description" ? "sm:col-span-2" : "")}>
                  <span className="text-xs font-semibold uppercase tracking-[0.22em] text-brand-500">{field.replace(/([A-Z])/g, " $1").toLowerCase()}</span>
                  {field === "description" ? (
                    <textarea value={String(editForm[field] ?? "")} onChange={(e) => setEditForm((c) => ({ ...c, [field]: e.target.value }))} className="input-shell min-h-24 resize-y" />
                  ) : (
                    <input value={String(editForm[field] ?? "")} onChange={(e) => setEditForm((c) => ({ ...c, [field]: e.target.value }))} className="input-shell" />
                  )}
                </label>
              ))}

              <div className="flex flex-col gap-2 sm:col-span-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-[0.22em] text-brand-500">Images</span>
                  <span className="text-xs text-stone-400">{editImages.length}/5</span>
                </div>
                {editImages.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                    {editImages.map((url, i) => (
                      <div key={i} className="group relative">
                        <img src={url} alt="" className="h-14 w-full rounded-[10px] object-cover" />
                        {i === 0 && (
                          <span className="absolute bottom-0.5 left-0.5 rounded-full bg-brand-700 px-1.5 py-0.5 text-[8px] font-bold text-white">Main</span>
                        )}
                        <button
                          type="button"
                          onClick={() => setEditImages((prev) => prev.filter((_, j) => j !== i))}
                          className="absolute -right-1 -top-1 hidden h-5 w-5 items-center justify-center rounded-full bg-rose-600 text-xs font-bold text-white shadow group-hover:flex"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {editImages.length < 5 && (
                  <button
                    type="button"
                    disabled={isUploadingEdit}
                    onClick={() => editFileRef.current?.click()}
                    className={buttonStyles({ variant: "secondary", size: "sm", className: "self-start" })}
                  >
                    {isUploadingEdit ? "Uploading…" : "+ Add image"}
                  </button>
                )}
                <input
                  ref={editFileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void handleEditImageUpload(file);
                    e.target.value = "";
                  }}
                />
              </div>
              {(["price", "bulkPrice", "minBulkQty"] as const).map((field) => (
                <label key={field} className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold uppercase tracking-[0.22em] text-brand-500">{field.replace(/([A-Z])/g, " $1").toLowerCase()}</span>
                  <input type="number" min="1" value={Number(editForm[field] ?? 0)} onChange={(e) => setEditForm((c) => ({ ...c, [field]: Number(e.target.value) }))} className="input-shell" />
                </label>
              ))}
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold uppercase tracking-[0.22em] text-brand-500">category</span>
                <select value={String(editForm.category ?? "")} onChange={(e) => setEditForm((c) => ({ ...c, category: e.target.value }))} className="input-shell">
                  {PRODUCT_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </label>
            </div>
            <div className="flex flex-col gap-3 pt-2 sm:flex-row">
              <button type="button" onClick={handleSaveEdit} disabled={isSaving} className={buttonStyles({ size: "lg" })}>
                {isSaving ? "Saving…" : "Save changes"}
              </button>
              <button type="button" onClick={() => setEditingProduct(null)} className={buttonStyles({ variant: "secondary", size: "lg" })}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-900/60 p-4 backdrop-blur-sm">
          <div className="surface-elevated w-full max-w-sm space-y-5 p-6">
            <h3 className="text-xl font-semibold tracking-[-0.04em] text-brand-900">Delete listing?</h3>
            <p className="text-sm leading-6 text-stone-500">
              This will permanently remove the product from the marketplace. This action cannot be undone.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <button type="button" onClick={handleDelete} disabled={isDeleting} className="flex-1 rounded-full bg-rose-600 px-4 py-3 font-semibold text-white transition-all hover:bg-rose-700">
                {isDeleting ? "Deleting…" : "Yes, delete"}
              </button>
              <button type="button" onClick={() => setDeletingId(null)} className={buttonStyles({ variant: "secondary", size: "lg" })}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function OrdersTab({
  orders,
  isLoading,
  onOrdersChange,
}: {
  orders: OrderRecord[];
  isLoading: boolean;
  onOrdersChange: (orders: OrderRecord[]) => void;
}) {
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState<"all" | "paid" | "created" | "failed">("all");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

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
      onOrdersChange(orders.map((o) => (o._id === orderId ? data.order! : o)));
      toast({ variant: "success", title: `Marked as ${fulfillmentStatus.replace("_", " ")}` });
    } catch (e) {
      toast({ variant: "error", title: "Update failed", description: getFriendlyErrorMessage(e) });
    } finally {
      setUpdatingId(null);
    }
  };

  const filtered = orders.filter(
    (o) => statusFilter === "all" || o.paymentStatus === statusFilter,
  );

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="surface-elevated p-5">
            <div className="shimmer mb-3 h-4 w-48 rounded-full bg-brand-100" />
            <div className="shimmer h-16 rounded-[20px] bg-brand-100" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {(["all", "paid", "created", "failed"] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatusFilter(s)}
            className={cn(
              "rounded-full px-4 py-2 text-sm font-semibold transition-all duration-300",
              statusFilter === s
                ? "bg-brand-700 text-white shadow-sm"
                : "border border-white/85 bg-white/75 text-brand-700 backdrop-blur hover:bg-white",
            )}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
            <span className={cn("ml-2 rounded-full px-1.5 py-0.5 text-[10px] font-semibold", statusFilter === s ? "bg-white/20" : "bg-brand-100 text-brand-700")}>
              {s === "all" ? orders.length : orders.filter((o) => o.paymentStatus === s).length}
            </span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="surface-elevated p-8 text-center text-sm text-stone-500">No orders match this filter.</div>
      ) : (
        <div className="space-y-3">
          {filtered.map((order) => (
            <div key={order._id} className="surface-elevated p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-mono text-xs text-brand-500">{order._id}</p>
                  <p className="mt-1 text-sm text-stone-500">{formatDate(order.createdAt)} · {order.userLocation}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em]",
                    order.paymentStatus === "paid" ? "bg-emerald-50 text-emerald-700"
                    : order.paymentStatus === "failed" ? "bg-rose-50 text-rose-700"
                    : "bg-amber-50 text-amber-700"
                  )}>
                    {order.paymentStatus}
                  </span>
                  {fulfillmentBadge(order.fulfillmentStatus)}
                </div>
              </div>

              {order.items?.length > 0 && (
                <div className="mt-3 space-y-1.5">
                  {order.items.map((item, i) => (
                    <div key={i} className="flex items-center gap-3 rounded-[16px] bg-brand-50/60 px-3 py-2">
                      <img src={item.image} alt={item.name} className="h-10 w-10 rounded-[10px] object-cover" />
                      <p className="min-w-0 flex-1 truncate text-sm font-semibold text-brand-900">{item.name}</p>
                      <p className="text-sm text-stone-500">×{item.quantity}</p>
                      <p className="text-sm font-semibold text-brand-900">{formatCurrency(item.totalPrice)}</p>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-brand-100/60 pt-4">
                <p className="text-2xl font-semibold tracking-[-0.04em] text-brand-900">{formatCurrency(order.totalAmount)}</p>
                <div className="flex flex-wrap gap-2">
                  {order.paymentStatus === "paid" && (!order.fulfillmentStatus || order.fulfillmentStatus === "pending" || order.fulfillmentStatus === "confirmed" || order.fulfillmentStatus === "processing") && (
                    <button type="button" disabled={updatingId === order._id} onClick={() => updateFulfillment(order._id, "packed")} className={buttonStyles({ variant: "secondary", size: "sm" })}>
                      {updatingId === order._id ? "Updating…" : "Mark as Packed"}
                    </button>
                  )}
                  {order.paymentStatus === "paid" && (!order.fulfillmentStatus || order.fulfillmentStatus === "pending" || order.fulfillmentStatus === "confirmed" || order.fulfillmentStatus === "processing" || order.fulfillmentStatus === "packed") && (
                    <button type="button" disabled={updatingId === order._id} onClick={() => updateFulfillment(order._id, "shipped")} className={buttonStyles({ size: "sm" })}>
                      {updatingId === order._id ? "Updating…" : "Mark as Shipped"}
                    </button>
                  )}
                  {order.fulfillmentStatus === "shipped" && (
                    <button type="button" disabled={updatingId === order._id} onClick={() => updateFulfillment(order._id, "delivered")} className={buttonStyles({ size: "sm" })}>
                      {updatingId === order._id ? "Updating…" : "Mark as Delivered"}
                    </button>
                  )}
                  {order.fulfillmentStatus === "refund_requested" && (
                    <span className="rounded-full bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">Refund requested</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AnalyticsTab({
  products,
  orders,
  sellerId,
}: {
  products: ProductRecord[];
  orders: OrderRecord[];
  sellerId: string;
}) {
  const [shipmentStats, setShipmentStats] = useState<{ total: number; delivered: number; inTransit: number; rto: number } | null>(null);
  useEffect(() => {
    if (!sellerId) return;
    void fetch(`/api/shipments?sellerId=${sellerId}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d: { shipments?: { shipmentStatus: string }[] }) => {
        const s = d.shipments ?? [];
        setShipmentStats({
          total: s.length,
          delivered: s.filter((x) => x.shipmentStatus === "delivered").length,
          inTransit: s.filter((x) => ["in_transit", "out_for_delivery", "picked_up"].includes(x.shipmentStatus)).length,
          rto: s.filter((x) => x.shipmentStatus === "returned_to_origin").length,
        });
      })
      .catch(() => null);
  }, [sellerId]);
  const paidOrders = orders.filter((o) => o.paymentStatus === "paid");
  const totalRevenue = paidOrders.reduce((sum, o) => sum + o.totalAmount, 0);
  const pendingOrders = orders.filter((o) => o.paymentStatus === "created").length;
  const failedOrders = orders.filter((o) => o.paymentStatus === "failed").length;

  const productRevenue: Record<string, { name: string; image: string; qty: number; revenue: number }> = {};
  for (const order of paidOrders) {
    for (const item of order.items ?? []) {
      const id = item.productId;
      if (!productRevenue[id]) {
        productRevenue[id] = { name: item.name, image: item.image, qty: 0, revenue: 0 };
      }
      productRevenue[id].qty += item.quantity;
      productRevenue[id].revenue += item.totalPrice;
    }
  }
  const topProducts = Object.values(productRevenue)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total revenue", value: formatCurrency(totalRevenue), dark: true },
          { label: "Total orders", value: String(orders.length), dark: false },
          { label: "Paid orders", value: String(paidOrders.length), dark: false },
          { label: "Active listings", value: String(products.length), dark: false },
        ].map((stat) => (
          <div key={stat.label} className={stat.dark ? "surface-dark p-5" : "surface-elevated p-5"}>
            <p className={cn("text-[11px] uppercase tracking-[0.18em]", stat.dark ? "text-white/60" : "text-brand-500")}>{stat.label}</p>
            <p className={cn("mt-3 text-4xl font-semibold tracking-[-0.05em]", stat.dark ? "" : "text-brand-900")}>{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Pending payment", value: pendingOrders, color: "bg-amber-50 text-amber-700" },
          { label: "Failed payments", value: failedOrders, color: "bg-rose-50 text-rose-700" },
          { label: "Refund requests", value: orders.filter((o) => o.fulfillmentStatus === "refund_requested").length, color: "bg-rose-50 text-rose-700" },
        ].map((s) => (
          <div key={s.label} className="surface-elevated p-5">
            <p className="text-[11px] uppercase tracking-[0.18em] text-brand-500">{s.label}</p>
            <p className={cn("mt-2 inline-flex rounded-full px-3 py-1 text-3xl font-semibold tracking-[-0.05em]", s.value > 0 ? s.color : "text-brand-900")}>{s.value}</p>
          </div>
        ))}
      </div>

      {shipmentStats && (
        <div className="surface-elevated p-6">
          <h3 className="text-xl font-semibold tracking-[-0.04em] text-brand-900">Shipment overview</h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-4">
            {[
              { label: "Total shipments", value: shipmentStats.total, color: "text-brand-900" },
              { label: "In transit", value: shipmentStats.inTransit, color: "text-indigo-700" },
              { label: "Delivered", value: shipmentStats.delivered, color: "text-emerald-700" },
              { label: "RTO", value: shipmentStats.rto, color: "text-rose-700" },
            ].map((s) => (
              <div key={s.label} className="rounded-[18px] bg-brand-50/60 p-4">
                <p className="text-[11px] uppercase tracking-[0.18em] text-brand-500">{s.label}</p>
                <p className={cn("mt-2 text-3xl font-semibold tracking-[-0.05em]", s.color)}>{s.value}</p>
                {shipmentStats.total > 0 && s.label !== "Total shipments" && (
                  <p className="mt-1 text-xs text-stone-400">
                    {Math.round((s.value / shipmentStats.total) * 100)}%
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="surface-elevated overflow-hidden">
        <div className="border-b border-brand-100/60 px-6 py-4">
          <h3 className="text-xl font-semibold tracking-[-0.04em] text-brand-900">Top products by revenue</h3>
        </div>
        {topProducts.length === 0 ? (
          <p className="px-6 py-8 text-sm text-stone-500">No paid orders yet.</p>
        ) : (
          <div className="divide-y divide-brand-100/60">
            {topProducts.map((p, i) => (
              <div key={p.name} className="flex flex-wrap items-center gap-4 px-6 py-4 sm:flex-nowrap">
                <span className="w-6 text-right text-2xl font-semibold tracking-[-0.05em] text-brand-200">{i + 1}</span>
                <img src={p.image} alt={p.name} className="h-12 w-12 rounded-[14px] object-cover" />
                <div className="flex-1 min-w-0">
                  <p className="truncate font-semibold text-brand-900">{p.name}</p>
                  <p className="text-sm text-stone-500">{p.qty} unit{p.qty !== 1 ? "s" : ""} sold</p>
                </div>
                <p className="text-xl font-semibold tracking-[-0.04em] text-brand-900">{formatCurrency(p.revenue)}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function SellerDashboardClient() {
  const { data: session, status } = useSession();
  const sellerId = session?.user?.id ?? "";

  const [activeTab, setActiveTab] = useState<SellerTab>("listings");
  const [products, setProducts] = useState<ProductRecord[]>([]);
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [isLoadingOrders, setIsLoadingOrders] = useState(true);
  const [productsError, setProductsError] = useState<string | null>(null);

  const loadProducts = async (sid: string) => {
    setIsLoadingProducts(true);
    setProductsError(null);
    try {
      const url = sid ? `/api/products?sellerId=${sid}` : "/api/products";
      const res = await fetch(url, { cache: "no-store" });
      const data = (await res.json()) as { error?: string; products?: ProductRecord[] };
      if (!res.ok || !data.products) throw new Error(data.error);
      setProducts(data.products);
    } catch (e) {
      setProductsError(getFriendlyErrorMessage(e));
    } finally {
      setIsLoadingProducts(false);
    }
  };

  const loadOrders = async (sid: string) => {
    if (!sid) return;
    setIsLoadingOrders(true);
    try {
      const res = await fetch(`/api/orders?sellerId=${sid}`, { cache: "no-store" });
      const data = (await res.json()) as { error?: string; orders?: OrderRecord[] };
      if (res.ok && data.orders) setOrders(data.orders);
    } finally {
      setIsLoadingOrders(false);
    }
  };

  useEffect(() => {
    if (status === "authenticated" && sellerId) {
      void loadProducts(sellerId);
      void loadOrders(sellerId);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, sellerId]);

  const SELLER_TABS: Array<{ id: SellerTab; label: string; count?: number }> = [
    { id: "listings", label: "Listings", count: products.length || undefined },
    { id: "orders", label: "Orders", count: orders.length || undefined },
    { id: "shipments", label: "Shipments" },
    { id: "ndr", label: "NDR" },
    { id: "cod", label: "COD" },
    { id: "returns", label: "Returns" },
    { id: "analytics", label: "Analytics" },
  ];

  return (
    <div className="space-y-6">
      <div className="surface-elevated p-6 sm:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <span className="eyebrow">Seller dashboard</span>
            <h2 className="mt-4 text-3xl font-semibold tracking-[-0.05em] text-brand-900 sm:text-4xl">
              Seller panel
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-500">
              Manage product listings, process incoming orders, and monitor your sales performance.
            </p>
          </div>
          <div className="flex flex-shrink-0 flex-wrap items-center gap-3">
            {session?.user?.name && (
              <div className="rounded-[20px] bg-brand-50 px-4 py-2.5 text-center">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-400">
                  Signed in as
                </p>
                <p className="mt-0.5 text-sm font-semibold text-brand-900">
                  {session.user.name}
                </p>
              </div>
            )}
            <button
              type="button"
              onClick={() => void signOut({ callbackUrl: "/auth/signin" })}
              className={buttonStyles({ variant: "secondary", size: "sm" })}
            >
              Sign out
            </button>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-2 sm:flex sm:flex-wrap">
          {SELLER_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "inline-flex w-full items-center justify-center gap-2 rounded-full px-4 py-2 text-center text-sm font-semibold transition-all duration-300 sm:w-auto sm:justify-start",
                activeTab === tab.id
                  ? "bg-brand-700 text-white shadow-sm"
                  : "border border-white/85 bg-white/75 text-brand-700 shadow-sm backdrop-blur hover:bg-white",
              )}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span className={cn("inline-flex min-h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-semibold", activeTab === tab.id ? "bg-white/20 text-white" : "bg-brand-100 text-brand-700")}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "listings" && (
        <ListingsTab
          products={products}
          isLoading={isLoadingProducts}
          error={productsError}
          onRefresh={() => void loadProducts(sellerId)}
          onProductsChange={setProducts}
        />
      )}
      {activeTab === "orders" && (
        <OrdersTab
          orders={orders}
          isLoading={isLoadingOrders}
          onOrdersChange={setOrders}
        />
      )}
      {activeTab === "shipments" && sellerId && (
        <SellerShipmentsTab sellerId={sellerId} />
      )}
      {activeTab === "ndr" && <SellerNDRTab />}
      {activeTab === "cod" && <SellerCodRemittanceTab />}
      {activeTab === "returns" && <SellerReturnsTab />}
      {activeTab === "analytics" && (
        <AnalyticsTab products={products} orders={orders} sellerId={sellerId} />
      )}
    </div>
  );
}
