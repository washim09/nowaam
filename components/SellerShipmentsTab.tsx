"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { buttonStyles } from "@/components/Button";
import { SellerShippingSettings } from "@/components/SellerShippingSettings";
import { useToast } from "@/components/ToastProvider";
import { COURIER_PARTNER, SHIPMENT_TIMELINE_LABELS } from "@/lib/constants";
import { cn, formatCurrency, getFriendlyErrorMessage } from "@/lib/utils";
import type { OrderRecord, ShipmentRecord } from "@/types";

type ShipmentFilter = "all" | "shipment_created" | "picked_up" | "in_transit" | "delivered";

const FILTER_LABELS: Record<ShipmentFilter, string> = {
  all: "All",
  shipment_created: "Pending",
  picked_up: "Picked Up",
  in_transit: "In Transit",
  delivered: "Delivered",
};

function statusPill(status: string) {
  const colorMap: Record<string, string> = {
    shipment_created: "bg-amber-50 text-amber-700",
    awb_assigned: "bg-sky-50 text-sky-700",
    pickup_scheduled: "bg-amber-50 text-amber-700",
    picked_up: "bg-blue-50 text-blue-700",
    in_transit: "bg-indigo-50 text-indigo-700",
    reached_hub: "bg-indigo-50 text-indigo-700",
    out_for_delivery: "bg-orange-50 text-orange-700",
    delivered: "bg-emerald-50 text-emerald-700",
    failed_delivery: "bg-rose-50 text-rose-700",
    returned_to_origin: "bg-stone-100 text-stone-600",
  };
  const label =
    SHIPMENT_TIMELINE_LABELS[status]?.label ?? status.replace(/_/g, " ");
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em]",
        colorMap[status] ?? "bg-brand-50 text-brand-700",
      )}
    >
      {label}
    </span>
  );
}

function formatDate(d?: string) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

type CreateShipmentForm = {
  pickupFullName: string;
  pickupPhone: string;
  pickupAddressLine: string;
  pickupCity: string;
  pickupState: string;
  pickupPincode: string;
  packageWeight: string;
  packageLength: string;
  packageWidth: string;
  packageHeight: string;
  paymentMode: "prepaid" | "cod";
  autoLabel: boolean;
};

const DEFAULT_FORM: CreateShipmentForm = {
  pickupFullName: "",
  pickupPhone: "",
  pickupAddressLine: "",
  pickupCity: "",
  pickupState: "",
  pickupPincode: "",
  packageWeight: "",
  packageLength: "",
  packageWidth: "",
  packageHeight: "",
  paymentMode: "prepaid",
  autoLabel: true,
};

export function SellerShipmentsTab({ sellerId }: { sellerId: string }) {
  const { toast } = useToast();
  const [shipments, setShipments] = useState<ShipmentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<ShipmentFilter>("all");
  const [pendingOrders, setPendingOrders] = useState<OrderRecord[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [form, setForm] = useState<CreateShipmentForm>(DEFAULT_FORM);
  const [isCreating, setIsCreating] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkGenerating, setIsBulkGenerating] = useState(false);

  const loadShipments = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/shipments?sellerId=${sellerId}`, { cache: "no-store" });
      const data = (await res.json()) as { shipments?: ShipmentRecord[]; error?: string };
      if (res.ok && data.shipments) setShipments(data.shipments);
    } finally {
      setIsLoading(false);
    }
  }, [sellerId]);

  const loadPendingOrders = useCallback(async () => {
    try {
      const res = await fetch(`/api/orders?sellerId=${sellerId}`, { cache: "no-store" });
      const data = (await res.json()) as { orders?: OrderRecord[]; error?: string };
      if (res.ok && data.orders) {
        setPendingOrders(
          data.orders.filter(
            (o) =>
              o.paymentStatus === "paid" &&
              (!o.fulfillmentStatus ||
                o.fulfillmentStatus === "pending" ||
                o.fulfillmentStatus === "confirmed"),
          ),
        );
      }
    } catch (_) {}
  }, [sellerId]);

  useEffect(() => {
    void loadShipments();
    void loadPendingOrders();
  }, [loadShipments, loadPendingOrders]);

  const handleCreateShipment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrderId) {
      toast({ variant: "error", title: "Select an order", description: "Choose which order to ship." });
      return;
    }
    if (!form.packageWeight || parseFloat(form.packageWeight) < 1) {
      toast({ variant: "error", title: "Weight required", description: "Enter package weight in grams." });
      return;
    }

    setIsCreating(true);
    try {
      const res = await fetch("/api/shipments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: selectedOrderId,
          pickupAddress: {
            fullName: form.pickupFullName,
            phone: form.pickupPhone,
            addressLine: form.pickupAddressLine,
            city: form.pickupCity,
            state: form.pickupState,
            pincode: form.pickupPincode,
          },
          packageWeight: parseFloat(form.packageWeight),
          packageDimensions:
            form.packageLength && form.packageWidth && form.packageHeight
              ? {
                  length: parseFloat(form.packageLength),
                  width: parseFloat(form.packageWidth),
                  height: parseFloat(form.packageHeight),
                }
              : undefined,
          paymentMode: form.paymentMode,
          autoSelectLowestRate: form.autoLabel,
        }),
      });
      const data = (await res.json()) as {
        shipment?: ShipmentRecord;
        error?: string;
        labelGenerated?: boolean;
      };
      if (!res.ok) throw new Error(data.error);
      toast({
        variant: "success",
        title: data.labelGenerated ? "Shipment created & label generated" : "Shipment created",
        description: data.labelGenerated
          ? "AWB assigned. You can now print the label."
          : "Go to the shipment to generate the label.",
      });
      setShowCreateForm(false);
      setForm(DEFAULT_FORM);
      setSelectedOrderId("");
      void loadShipments();
      void loadPendingOrders();
    } catch (e) {
      toast({ variant: "error", title: "Failed", description: getFriendlyErrorMessage(e) });
    } finally {
      setIsCreating(false);
    }
  };

  const schedulePickup = async (shipmentId: string) => {
    setUpdatingId(shipmentId);
    try {
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      const res = await fetch(`/api/shipments/${shipmentId}/pickup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pickupDate: tomorrow }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error);
      toast({ variant: "success", title: "Pickup scheduled", description: "Courier pickup arranged for tomorrow." });
      void loadShipments();
    } catch (e) {
      toast({ variant: "error", title: "Failed", description: getFriendlyErrorMessage(e) });
    } finally {
      setUpdatingId(null);
    }
  };

  const generateLabel = async (shipmentId: string) => {
    setUpdatingId(shipmentId);
    try {
      const res = await fetch(`/api/shipments/${shipmentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ generateLabel: true }),
      });
      const data = (await res.json()) as { shipment?: ShipmentRecord; error?: string };
      if (!res.ok) throw new Error(data.error);
      toast({ variant: "success", title: "Label generated", description: `AWB: ${data.shipment?.awbNumber}` });
      void loadShipments();
    } catch (e) {
      toast({ variant: "error", title: "Failed", description: getFriendlyErrorMessage(e) });
    } finally {
      setUpdatingId(null);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    const unlabelled = filtered.filter((s) => !s.awbNumber && s.easypostShipmentId).map((s) => s._id);
    if (unlabelled.every((id) => selectedIds.has(id))) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(unlabelled));
    }
  };

  const bulkGenerateLabels = async () => {
    const ids = Array.from(selectedIds);
    if (!ids.length) return;
    setIsBulkGenerating(true);
    let success = 0;
    let fail = 0;
    for (const id of ids) {
      try {
        const res = await fetch(`/api/shipments/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ generateLabel: true }),
        });
        if (res.ok) success++; else fail++;
      } catch { fail++; }
    }
    setSelectedIds(new Set());
    setIsBulkGenerating(false);
    toast({
      variant: success > 0 ? "success" : "error",
      title: `${success} label${success !== 1 ? "s" : ""} generated${fail > 0 ? `, ${fail} failed` : ""}`,
    });
    void loadShipments();
  };

  const updateStatus = async (shipmentId: string, status: string) => {
    setUpdatingId(shipmentId);
    try {
      const res = await fetch(`/api/shipments/${shipmentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shipmentStatus: status }),
      });
      if (!res.ok) throw new Error("Update failed");
      toast({ variant: "success", title: "Status updated" });
      void loadShipments();
    } catch (e) {
      toast({ variant: "error", title: "Failed", description: getFriendlyErrorMessage(e) });
    } finally {
      setUpdatingId(null);
    }
  };

  const filtered = filter === "all"
    ? shipments
    : shipments.filter((s) => s.shipmentStatus === filter);

  const stats = {
    total: shipments.length,
    pending: shipments.filter((s) => s.shipmentStatus === "shipment_created" || s.shipmentStatus === "awb_assigned").length,
    inTransit: shipments.filter((s) => ["picked_up", "in_transit", "reached_hub"].includes(s.shipmentStatus)).length,
    delivered: shipments.filter((s) => s.shipmentStatus === "delivered").length,
  };

  return (
    <div className="space-y-6">
      <SellerShippingSettings />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total Shipments", value: stats.total, dark: false },
          { label: "Awaiting Pickup", value: stats.pending, dark: false },
          { label: "In Transit", value: stats.inTransit, dark: false },
          { label: "Delivered", value: stats.delivered, dark: true },
        ].map((s) => (
          <div key={s.label} className={s.dark ? "surface-dark p-5" : "surface-elevated p-5"}>
            <p className={cn("text-[11px] uppercase tracking-[0.18em]", s.dark ? "text-white/60" : "text-brand-500")}>{s.label}</p>
            <p className={cn("mt-3 text-4xl font-semibold tracking-[-0.05em]", !s.dark && "text-brand-900")}>{s.value}</p>
          </div>
        ))}
      </div>

      {pendingOrders.length > 0 && (
        <div className="surface-elevated overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-brand-100/60 px-6 py-4">
            <div>
              <h3 className="text-xl font-semibold tracking-[-0.04em] text-brand-900">Orders Ready to Ship</h3>
              <p className="mt-1 text-sm text-stone-500">{pendingOrders.length} paid order{pendingOrders.length !== 1 ? "s" : ""} awaiting shipment</p>
            </div>
            <button
              type="button"
              onClick={() => setShowCreateForm(true)}
              className={buttonStyles({ size: "sm" })}
            >
              + Create Shipment
            </button>
          </div>
          <div className="divide-y divide-brand-100/40">
            {pendingOrders.slice(0, 5).map((order) => (
              <div key={order._id} className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
                <div className="min-w-0">
                  <p className="font-mono text-xs text-brand-500">{order._id}</p>
                  <p className="mt-0.5 text-sm font-semibold text-brand-900">
                    {order.items?.length} item{order.items?.length !== 1 ? "s" : ""} · {formatCurrency(order.totalAmount)}
                  </p>
                  <p className="text-xs text-stone-400">{formatDate(order.createdAt)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedOrderId(order._id);
                    setShowCreateForm(true);
                  }}
                  className={buttonStyles({ size: "sm" })}
                >
                  Ship this order
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="surface-elevated overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-brand-100/60 px-6 py-4">
          <h3 className="text-xl font-semibold tracking-[-0.04em] text-brand-900">All Shipments</h3>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(FILTER_LABELS) as ShipmentFilter[]).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-semibold transition-all duration-200",
                  filter === f
                    ? "bg-brand-700 text-white"
                    : "border border-white/85 bg-white/75 text-brand-700 hover:bg-white",
                )}
              >
                {FILTER_LABELS[f]}
                <span className={cn("ml-1.5 text-[10px]", filter === f ? "opacity-70" : "opacity-50")}>
                  {f === "all" ? shipments.length : shipments.filter((s) => s.shipmentStatus === f).length}
                </span>
              </button>
            ))}
            <button
              type="button"
              onClick={() => void loadShipments()}
              className={cn("rounded-full px-3 py-1.5 text-xs font-semibold", "border border-white/85 bg-white/75 text-brand-700 hover:bg-white")}
            >
              Refresh
            </button>
          </div>
        </div>

        {selectedIds.size > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-100 bg-amber-50/60 px-6 py-3">
            <p className="text-sm font-semibold text-amber-800">{selectedIds.size} shipment{selectedIds.size !== 1 ? "s" : ""} selected</p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={isBulkGenerating}
                onClick={() => void bulkGenerateLabels()}
                className={buttonStyles({ size: "sm" })}
              >
                {isBulkGenerating ? `Generating…` : `Generate ${selectedIds.size} Label${selectedIds.size !== 1 ? "s" : ""}`}
              </button>
              <button type="button" onClick={() => setSelectedIds(new Set())} className={buttonStyles({ variant: "secondary", size: "sm" })}>Clear</button>
            </div>
          </div>
        )}
        {isLoading ? (
          <div className="space-y-px">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="px-6 py-4">
                <div className="shimmer mb-2 h-4 w-48 rounded-full bg-brand-100" />
                <div className="shimmer h-3 w-32 rounded-full bg-brand-100" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-3xl">📦</p>
            <p className="mt-3 text-sm text-stone-500">
              {filter === "all" ? "No shipments yet. Create one from an order above." : `No ${FILTER_LABELS[filter].toLowerCase()} shipments.`}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-brand-100/40">
            {filtered.map((shipment) => {
              const isBulkEligible = !shipment.awbNumber && !!shipment.easypostShipmentId;
              return (
              <div key={shipment._id} className={cn("px-6 py-4", selectedIds.has(shipment._id) && "bg-amber-50/40")}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    {isBulkEligible && (
                      <input
                        type="checkbox"
                        checked={selectedIds.has(shipment._id)}
                        onChange={() => toggleSelect(shipment._id)}
                        className="mt-1 h-4 w-4 flex-shrink-0 cursor-pointer rounded accent-brand-700"
                      />
                    )}
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      {statusPill(shipment.shipmentStatus)}
                      {shipment.paymentMode === "cod" && (
                        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-700">
                          COD
                        </span>
                      )}
                    </div>
                    <p className="mt-2 font-mono text-xs text-brand-500">{shipment.orderId}</p>
                    {shipment.awbNumber ? (
                      <p className="mt-1 font-mono text-sm font-semibold text-brand-900">
                        AWB: {shipment.awbNumber}
                      </p>
                    ) : (
                      <p className="mt-1 text-sm text-stone-400 italic">No AWB yet</p>
                    )}
                    {shipment.carrier && (
                      <p className="mt-0.5 text-xs text-stone-500">
                        {shipment.carrier} · {shipment.service ?? "Standard"} · {formatCurrency(shipment.shippingCost ?? 0)}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-stone-400">{formatDate(shipment.createdAt)}</p>
                  </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {shipment.awbNumber && (
                      <Link
                        href={`/track/${shipment.awbNumber}`}
                        target="_blank"
                        className={cn(buttonStyles({ variant: "secondary", size: "sm" }))}
                      >
                        Track
                      </Link>
                    )}
                    {shipment.shippingLabel && (
                      <a
                        href={shipment.shippingLabel}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={cn(buttonStyles({ variant: "secondary", size: "sm" }))}
                      >
                        Print Label
                      </a>
                    )}
                    {!shipment.awbNumber && shipment.easypostShipmentId && (
                      <button
                        type="button"
                        disabled={updatingId === shipment._id}
                        onClick={() => void generateLabel(shipment._id)}
                        className={buttonStyles({ size: "sm" })}
                      >
                        {updatingId === shipment._id ? "Generating…" : "Generate Label"}
                      </button>
                    )}
                    {shipment.awbNumber && shipment.shipmentStatus === "awb_assigned" && (
                      <button
                        type="button"
                        disabled={updatingId === shipment._id}
                        onClick={() => void schedulePickup(shipment._id)}
                        className={buttonStyles({ size: "sm" })}
                      >
                        {updatingId === shipment._id ? "Scheduling…" : "Schedule Pickup"}
                      </button>
                    )}
                    {shipment.shipmentStatus === "pickup_scheduled" && (
                      <button
                        type="button"
                        disabled={updatingId === shipment._id}
                        onClick={() => void updateStatus(shipment._id, "picked_up")}
                        className={buttonStyles({ size: "sm" })}
                      >
                        {updatingId === shipment._id ? "Updating…" : "Mark Picked Up"}
                      </button>
                    )}
                  </div>
                </div>

                {shipment.estimatedDeliveryDate && (
                  <p className="mt-2 text-xs text-stone-400">
                    Est. delivery:{" "}
                    {new Date(shipment.estimatedDeliveryDate).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                )}
              </div>
            );
            })}
          </div>
        )}
      </div>

      {showCreateForm && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-brand-900/60 p-4 backdrop-blur-sm">
          <div className="surface-elevated my-8 w-full max-w-2xl space-y-6 p-6 sm:p-8">
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-semibold tracking-[-0.04em] text-brand-900">Create Shipment</h3>
              <button type="button" onClick={() => setShowCreateForm(false)} className="rounded-full p-2 text-stone-500 hover:bg-brand-50">✕</button>
            </div>

            <form onSubmit={(e) => void handleCreateShipment(e)} className="space-y-5">
              <div>
                <label className="flex flex-col gap-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.22em] text-brand-500">Order to ship</span>
                  <select
                    value={selectedOrderId}
                    onChange={(e) => setSelectedOrderId(e.target.value)}
                    className="input-shell"
                    required
                  >
                    <option value="">Select an order…</option>
                    {pendingOrders.map((o) => (
                      <option key={o._id} value={o._id}>
                        {o._id.slice(-8)} · {formatCurrency(o.totalAmount)} · {o.items?.length} items
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div>
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-brand-500">Pickup Address</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    { field: "pickupFullName", label: "Full Name", placeholder: "Your business name" },
                    { field: "pickupPhone", label: "Phone", placeholder: "+91 98765 43210" },
                    { field: "pickupAddressLine", label: "Address", placeholder: "123 MG Road", span: true },
                    { field: "pickupCity", label: "City", placeholder: "Delhi" },
                    { field: "pickupState", label: "State", placeholder: "Delhi" },
                    { field: "pickupPincode", label: "Pincode", placeholder: "110001" },
                  ].map(({ field, label, placeholder, span }) => (
                    <label key={field} className={cn("flex flex-col gap-1.5", span ? "sm:col-span-2" : "")}>
                      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-400">{label}</span>
                      <input
                        value={form[field as keyof CreateShipmentForm] as string}
                        onChange={(e) => setForm((c) => ({ ...c, [field]: e.target.value }))}
                        placeholder={placeholder}
                        className="input-shell"
                      />
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-brand-500">Package Details</p>
                <div className="grid gap-3 sm:grid-cols-4">
                  <label className="flex flex-col gap-1.5 sm:col-span-1">
                    <span className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-400">Weight (g) *</span>
                    <input
                      type="number"
                      min="1"
                      required
                      value={form.packageWeight}
                      onChange={(e) => setForm((c) => ({ ...c, packageWeight: e.target.value }))}
                      placeholder="500"
                      className="input-shell"
                    />
                  </label>
                  {(["packageLength", "packageWidth", "packageHeight"] as const).map((f) => (
                    <label key={f} className="flex flex-col gap-1.5">
                      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-400">
                        {f.replace("package", "").replace("Length", "L").replace("Width", "W").replace("Height", "H")} (cm)
                      </span>
                      <input
                        type="number"
                        min="1"
                        value={form[f]}
                        onChange={(e) => setForm((c) => ({ ...c, [f]: e.target.value }))}
                        placeholder="10"
                        className="input-shell"
                      />
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.22em] text-brand-500">Payment Mode</span>
                  <select
                    value={form.paymentMode}
                    onChange={(e) => setForm((c) => ({ ...c, paymentMode: e.target.value as "prepaid" | "cod" }))}
                    className="input-shell"
                  >
                    <option value="prepaid">Prepaid</option>
                    <option value="cod">Cash on Delivery (COD)</option>
                  </select>
                </label>
                <div className="flex items-end pb-2">
                  <label className="flex cursor-pointer items-center gap-3">
                    <input
                      type="checkbox"
                      checked={form.autoLabel}
                      onChange={(e) => setForm((c) => ({ ...c, autoLabel: e.target.checked }))}
                      className="h-4 w-4 rounded"
                    />
                    <span className="text-sm font-semibold text-brand-900">Auto-generate label & AWB</span>
                  </label>
                </div>
              </div>

              <div className="flex flex-col gap-3 pt-2 sm:flex-row">
                <button type="submit" disabled={isCreating} className={buttonStyles({ size: "lg" })}>
                  {isCreating ? "Creating…" : "Create Shipment"}
                </button>
                <button type="button" onClick={() => setShowCreateForm(false)} className={buttonStyles({ variant: "secondary", size: "lg" })}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
