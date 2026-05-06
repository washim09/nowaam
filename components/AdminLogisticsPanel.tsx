"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { buttonStyles } from "@/components/Button";
import { useToast } from "@/components/ToastProvider";
import { SHIPMENT_TIMELINE_LABELS } from "@/lib/constants";
import { cn, formatCurrency, getFriendlyErrorMessage } from "@/lib/utils";
import type { ReturnRecord, ShipmentRecord } from "@/types";

type LogisticsView = "shipments" | "returns" | "cod" | "couriers";

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
  const label = SHIPMENT_TIMELINE_LABELS[status]?.label ?? status.replace(/_/g, " ");
  return (
    <span className={cn("inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em]", colorMap[status] ?? "bg-brand-50 text-brand-700")}>
      {label}
    </span>
  );
}

function returnStatusPill(status: string) {
  const colorMap: Record<string, string> = {
    requested: "bg-amber-50 text-amber-700",
    approved: "bg-sky-50 text-sky-700",
    rejected: "bg-rose-50 text-rose-700",
    refund_initiated: "bg-indigo-50 text-indigo-700",
    refund_completed: "bg-emerald-50 text-emerald-700",
    closed: "bg-stone-100 text-stone-600",
  };
  return (
    <span className={cn("inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em]", colorMap[status] ?? "bg-brand-50 text-brand-700")}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

function formatDate(d?: string) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function ShipmentsView() {
  const { toast } = useToast();
  const [shipments, setShipments] = useState<ShipmentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/shipments", { cache: "no-store" });
      const data = (await res.json()) as { shipments?: ShipmentRecord[] };
      if (data.shipments) setShipments(data.shipments);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const updateStatus = async (id: string, status: string) => {
    setUpdatingId(id);
    try {
      const res = await fetch(`/api/shipments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shipmentStatus: status }),
      });
      if (!res.ok) throw new Error("Update failed");
      toast({ variant: "success", title: "Status updated" });
      void load();
    } catch (e) {
      toast({ variant: "error", title: "Failed", description: getFriendlyErrorMessage(e) });
    } finally {
      setUpdatingId(null);
    }
  };

  const ALL_STATUSES = [
    "all", "shipment_created", "awb_assigned", "pickup_scheduled",
    "picked_up", "in_transit", "out_for_delivery", "delivered",
    "failed_delivery", "returned_to_origin",
  ];

  const filtered = statusFilter === "all"
    ? shipments
    : shipments.filter((s) => s.shipmentStatus === statusFilter);

  const stats = {
    total: shipments.length,
    active: shipments.filter((s) => ["picked_up", "in_transit", "reached_hub", "out_for_delivery"].includes(s.shipmentStatus)).length,
    failed: shipments.filter((s) => s.shipmentStatus === "failed_delivery").length,
    delivered: shipments.filter((s) => s.shipmentStatus === "delivered").length,
    rto: shipments.filter((s) => s.shipmentStatus === "returned_to_origin").length,
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {[
          { label: "Total", value: stats.total, color: "" },
          { label: "Active", value: stats.active, color: "text-blue-700" },
          { label: "Delivered", value: stats.delivered, color: "text-emerald-700" },
          { label: "Failed", value: stats.failed, color: "text-rose-700" },
          { label: "RTO", value: stats.rto, color: "text-stone-600" },
        ].map((s) => (
          <div key={s.label} className="surface-elevated p-4">
            <p className="text-[11px] uppercase tracking-[0.18em] text-brand-500">{s.label}</p>
            <p className={cn("mt-2 text-3xl font-semibold tracking-[-0.05em]", s.color || "text-brand-900")}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="surface-elevated overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-brand-100/60 px-6 py-4">
          <h3 className="text-xl font-semibold tracking-[-0.04em] text-brand-900">All Shipments</h3>
          <div className="flex flex-wrap gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input-shell w-48 text-sm"
            >
              {ALL_STATUSES.map((s) => (
                <option key={s} value={s}>{s === "all" ? "All Statuses" : s.replace(/_/g, " ")}</option>
              ))}
            </select>
            <button type="button" onClick={() => void load()} className={buttonStyles({ variant: "secondary", size: "sm" })}>Refresh</button>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-px p-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="shimmer h-16 rounded-[20px] bg-brand-100" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-stone-500">No shipments found.</p>
        ) : (
          <div className="divide-y divide-brand-100/40">
            {filtered.map((s) => (
              <div key={s._id} className="flex flex-wrap items-center gap-4 px-6 py-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {statusPill(s.shipmentStatus)}
                    {s.paymentMode === "cod" && (
                      <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">COD</span>
                    )}
                  </div>
                  <p className="mt-1.5 font-mono text-xs text-brand-500">{s.orderId}</p>
                  {s.awbNumber && (
                    <p className="mt-0.5 text-sm font-semibold text-brand-900">AWB: {s.awbNumber}</p>
                  )}
                  <p className="text-xs text-stone-400">
                    {s.carrier ?? "—"} · {formatDate(s.createdAt)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {s.awbNumber && (
                    <Link
                      href={`/track/${s.awbNumber}`}
                      target="_blank"
                      className={buttonStyles({ variant: "secondary", size: "sm" })}
                    >
                      Track
                    </Link>
                  )}
                  {s.shipmentStatus === "failed_delivery" && (
                    <button
                      type="button"
                      disabled={updatingId === s._id}
                      onClick={() => void updateStatus(s._id, "out_for_delivery")}
                      className={buttonStyles({ size: "sm" })}
                    >
                      {updatingId === s._id ? "…" : "Re-attempt"}
                    </button>
                  )}
                  {["picked_up", "in_transit"].includes(s.shipmentStatus) && (
                    <button
                      type="button"
                      disabled={updatingId === s._id}
                      onClick={() => void updateStatus(s._id, "delivered")}
                      className={buttonStyles({ size: "sm" })}
                    >
                      {updatingId === s._id ? "…" : "Mark Delivered"}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ReturnsView() {
  const { toast } = useToast();
  const [returns, setReturns] = useState<ReturnRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [noteModal, setNoteModal] = useState<{ id: string; action: "approve" | "reject" } | null>(null);
  const [adminNote, setAdminNote] = useState("");
  const [refundModal, setRefundModal] = useState<{ id: string; orderId: string } | null>(null);
  const [refundAmount, setRefundAmount] = useState("");

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/returns", { cache: "no-store" });
      const data = (await res.json()) as { returns?: ReturnRecord[] };
      if (data.returns) setReturns(data.returns);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const doAction = async (
    id: string,
    action: "approve" | "reject" | "initiate_refund" | "complete_refund",
    extra?: Record<string, unknown>,
  ) => {
    setProcessingId(id);
    try {
      const res = await fetch(`/api/returns/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extra }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error);
      toast({ variant: "success", title: `Return ${action.replace("_", " ")}d` });
      void load();
    } catch (e) {
      toast({ variant: "error", title: "Failed", description: getFriendlyErrorMessage(e) });
    } finally {
      setProcessingId(null);
      setNoteModal(null);
      setRefundModal(null);
    }
  };

  const pending = returns.filter((r) => r.returnStatus === "requested").length;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Pending Review", value: returns.filter((r) => r.returnStatus === "requested").length, color: "text-amber-700" },
          { label: "Approved", value: returns.filter((r) => ["approved", "picked_up", "in_transit", "received", "inspected"].includes(r.returnStatus)).length, color: "text-sky-700" },
          { label: "Refunded", value: returns.filter((r) => r.returnStatus === "refund_completed").length, color: "text-emerald-700" },
        ].map((s) => (
          <div key={s.label} className="surface-elevated p-4">
            <p className="text-[11px] uppercase tracking-[0.18em] text-brand-500">{s.label}</p>
            <p className={cn("mt-2 text-3xl font-semibold tracking-[-0.05em]", s.color)}>{s.value}</p>
          </div>
        ))}
      </div>

      {pending > 0 && (
        <div className="flex items-center gap-3 rounded-[20px] bg-amber-50 px-5 py-4">
          <span className="text-xl">⚠️</span>
          <p className="text-sm font-semibold text-amber-800">
            {pending} return{pending !== 1 ? "s" : ""} awaiting your review
          </p>
        </div>
      )}

      <div className="surface-elevated overflow-hidden">
        <div className="flex items-center justify-between border-b border-brand-100/60 px-6 py-4">
          <h3 className="text-xl font-semibold tracking-[-0.04em] text-brand-900">Return Requests</h3>
          <button type="button" onClick={() => void load()} className={buttonStyles({ variant: "secondary", size: "sm" })}>Refresh</button>
        </div>

        {isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="shimmer h-20 rounded-[20px] bg-brand-100" />
            ))}
          </div>
        ) : returns.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-stone-500">No return requests yet.</p>
        ) : (
          <div className="divide-y divide-brand-100/40">
            {returns.map((ret) => (
              <div key={ret._id} className="px-6 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    {returnStatusPill(ret.returnStatus)}
                    <p className="mt-2 font-mono text-xs text-brand-500">{ret.orderId}</p>
                    <p className="mt-1 text-sm font-semibold text-brand-900">
                      {ret.reason.replace(/_/g, " ")}
                    </p>
                    {ret.description && <p className="mt-0.5 text-sm text-stone-500">{ret.description}</p>}
                    <p className="mt-1 text-xs text-stone-400">{formatDate(ret.createdAt)}</p>
                    {ret.refundAmount ? (
                      <p className="mt-1 text-sm font-semibold text-indigo-700">
                        Refund: {formatCurrency(ret.refundAmount)}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {ret.returnStatus === "requested" && (
                      <>
                        <button
                          type="button"
                          disabled={processingId === ret._id}
                          onClick={() => setNoteModal({ id: ret._id, action: "approve" })}
                          className={buttonStyles({ size: "sm" })}
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          disabled={processingId === ret._id}
                          onClick={() => setNoteModal({ id: ret._id, action: "reject" })}
                          className="rounded-full bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-100"
                        >
                          Reject
                        </button>
                      </>
                    )}
                    {ret.returnStatus === "received" && (
                      <button
                        type="button"
                        disabled={processingId === ret._id}
                        onClick={() => setRefundModal({ id: ret._id, orderId: ret.orderId })}
                        className={buttonStyles({ size: "sm" })}
                      >
                        Initiate Refund
                      </button>
                    )}
                    {ret.returnStatus === "refund_initiated" && (
                      <button
                        type="button"
                        disabled={processingId === ret._id}
                        onClick={() => void doAction(ret._id, "complete_refund")}
                        className={buttonStyles({ size: "sm" })}
                      >
                        {processingId === ret._id ? "…" : "Complete Refund"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {noteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-900/60 p-4 backdrop-blur-sm">
          <div className="surface-elevated w-full max-w-sm space-y-4 p-6">
            <h3 className="text-xl font-semibold tracking-[-0.04em] text-brand-900">
              {noteModal.action === "approve" ? "Approve Return" : "Reject Return"}
            </h3>
            <label className="flex flex-col gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.22em] text-brand-500">Admin Note (optional)</span>
              <textarea
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                className="input-shell min-h-20 resize-none"
                placeholder={noteModal.action === "approve" ? "Pickup will be arranged within 2 days." : "Return not eligible per policy."}
              />
            </label>
            <div className="flex gap-3">
              <button
                type="button"
                disabled={processingId === noteModal.id}
                onClick={() => void doAction(noteModal.id, noteModal.action, { adminNote })}
                className={cn(buttonStyles({ size: "lg" }), noteModal.action === "reject" ? "!bg-rose-600 hover:!bg-rose-700" : "")}
              >
                {processingId === noteModal.id ? "Processing…" : noteModal.action === "approve" ? "Approve" : "Reject"}
              </button>
              <button type="button" onClick={() => setNoteModal(null)} className={buttonStyles({ variant: "secondary", size: "lg" })}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {refundModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-900/60 p-4 backdrop-blur-sm">
          <div className="surface-elevated w-full max-w-sm space-y-4 p-6">
            <h3 className="text-xl font-semibold tracking-[-0.04em] text-brand-900">Initiate Refund</h3>
            <label className="flex flex-col gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.22em] text-brand-500">Refund Amount (₹)</span>
              <input
                type="number"
                min="1"
                value={refundAmount}
                onChange={(e) => setRefundAmount(e.target.value)}
                className="input-shell"
                placeholder="Enter amount"
              />
            </label>
            <div className="flex gap-3">
              <button
                type="button"
                disabled={processingId === refundModal.id || !refundAmount}
                onClick={() => void doAction(refundModal.id, "initiate_refund", { refundAmount: parseFloat(refundAmount) })}
                className={buttonStyles({ size: "lg" })}
              >
                {processingId === refundModal.id ? "Processing…" : "Initiate Refund"}
              </button>
              <button type="button" onClick={() => setRefundModal(null)} className={buttonStyles({ variant: "secondary", size: "lg" })}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function AdminLogisticsPanel() {
  const [view, setView] = useState<LogisticsView>("shipments");

  return (
    <div className="space-y-6">
      <div className="surface-elevated p-6 sm:p-8">
        <span className="eyebrow">Logistics Management</span>
        <h2 className="mt-4 text-3xl font-semibold tracking-[-0.05em] text-brand-900 sm:text-4xl">
          Delivery Controls
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-500">
          Manage shipments, approve returns, initiate refunds, and monitor delivery performance across the platform.
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          {([
            { id: "shipments", label: "Shipments" },
            { id: "returns", label: "Returns" },
            { id: "cod", label: "COD" },
            { id: "couriers", label: "Couriers" },
          ] as const).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setView(tab.id)}
              className={cn(
                "rounded-full px-5 py-2 text-sm font-semibold transition-all duration-300",
                view === tab.id
                  ? "bg-brand-700 text-white shadow-sm"
                  : "border border-white/85 bg-white/75 text-brand-700 hover:bg-white",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {view === "shipments" && <ShipmentsView />}

      {view === "returns" && <ReturnsView />}
      {view === "cod" && <CodReconciliationView />}
      {view === "couriers" && <CourierPerformanceView />}
    </div>
  );
}

function CodReconciliationView() {
  const [shipments, setShipments] = useState<ShipmentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/shipments", { cache: "no-store" });
      const data = (await res.json()) as { shipments?: ShipmentRecord[] };
      setShipments((data.shipments ?? []).filter((s) => s.paymentMode === "cod"));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const pending = shipments.filter((s) => !["delivered", "returned_to_origin"].includes(s.shipmentStatus));
  const delivered = shipments.filter((s) => s.shipmentStatus === "delivered");
  const rto = shipments.filter((s) => s.shipmentStatus === "returned_to_origin");
  const totalCod = delivered.reduce((sum, s) => sum + (s.codAmount ?? 0), 0);
  const pendingCod = pending.reduce((sum, s) => sum + (s.codAmount ?? 0), 0);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total COD Shipments", value: shipments.length, color: "text-brand-900" },
          { label: "COD Collected", value: formatCurrency(totalCod), color: "text-emerald-700" },
          { label: "COD Pending", value: formatCurrency(pendingCod), color: "text-amber-700" },
          { label: "RTO (COD)", value: rto.length, color: "text-rose-700" },
        ].map((s) => (
          <div key={s.label} className="surface-elevated p-5">
            <p className="text-[11px] uppercase tracking-[0.18em] text-brand-500">{s.label}</p>
            <p className={cn("mt-2 text-3xl font-semibold tracking-[-0.05em]", s.color)}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="surface-elevated overflow-hidden">
        <div className="flex items-center justify-between border-b border-brand-100/60 px-6 py-4">
          <h3 className="text-xl font-semibold tracking-[-0.04em] text-brand-900">COD Shipments</h3>
          <button type="button" onClick={() => void load()} className={buttonStyles({ variant: "secondary", size: "sm" })}>Refresh</button>
        </div>
        {isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="shimmer h-16 rounded-[20px] bg-brand-100" />
            ))}
          </div>
        ) : shipments.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-stone-500">No COD shipments found.</p>
        ) : (
          <div className="divide-y divide-brand-100/40">
            {shipments.map((s) => (
              <div key={s._id} className="flex flex-wrap items-center gap-4 px-6 py-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {statusPill(s.shipmentStatus)}
                    <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">COD</span>
                  </div>
                  <p className="mt-1 font-mono text-xs text-brand-500">{String(s.orderId)}</p>
                  {s.awbNumber && <p className="text-sm font-semibold text-brand-900">AWB: {s.awbNumber}</p>}
                  <p className="text-xs text-stone-400">{s.carrier ?? "—"}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold tracking-[-0.04em] text-brand-900">
                    {formatCurrency(s.codAmount ?? 0)}
                  </p>
                  <p className={cn("text-xs font-semibold",
                    s.shipmentStatus === "delivered" ? "text-emerald-700" :
                    s.shipmentStatus === "returned_to_origin" ? "text-rose-700" : "text-amber-700"
                  )}>
                    {s.shipmentStatus === "delivered" ? "Collected" :
                     s.shipmentStatus === "returned_to_origin" ? "Not Collected" : "Pending"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CourierPerformanceView() {
  const [shipments, setShipments] = useState<ShipmentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/shipments", { cache: "no-store" });
      const data = (await res.json()) as { shipments?: ShipmentRecord[] };
      setShipments(data.shipments ?? []);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  type CourierStat = {
    carrier: string;
    total: number;
    delivered: number;
    rto: number;
    failed: number;
    deliveryRate: number;
    rtoRate: number;
  };

  const courierMap: Record<string, CourierStat> = {};
  for (const s of shipments) {
    const carrier = s.carrier ?? "Unknown";
    if (!courierMap[carrier]) {
      courierMap[carrier] = { carrier, total: 0, delivered: 0, rto: 0, failed: 0, deliveryRate: 0, rtoRate: 0 };
    }
    const c = courierMap[carrier];
    c.total++;
    if (s.shipmentStatus === "delivered") c.delivered++;
    if (s.shipmentStatus === "returned_to_origin") c.rto++;
    if (s.shipmentStatus === "failed_delivery") c.failed++;
  }
  const courierStats = Object.values(courierMap).map((c) => ({
    ...c,
    deliveryRate: c.total > 0 ? Math.round((c.delivered / c.total) * 100) : 0,
    rtoRate: c.total > 0 ? Math.round((c.rto / c.total) * 100) : 0,
  })).sort((a, b) => b.total - a.total);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Active Couriers", value: courierStats.length },
          { label: "Total Shipments", value: shipments.length },
          { label: "Avg Delivery Rate", value: courierStats.length > 0
            ? `${Math.round(courierStats.reduce((s, c) => s + c.deliveryRate, 0) / courierStats.length)}%`
            : "—" },
        ].map((s) => (
          <div key={s.label} className="surface-elevated p-5">
            <p className="text-[11px] uppercase tracking-[0.18em] text-brand-500">{s.label}</p>
            <p className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-brand-900">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="surface-elevated overflow-hidden">
        <div className="flex items-center justify-between border-b border-brand-100/60 px-6 py-4">
          <h3 className="text-xl font-semibold tracking-[-0.04em] text-brand-900">Courier Performance</h3>
          <button type="button" onClick={() => void load()} className={buttonStyles({ variant: "secondary", size: "sm" })}>Refresh</button>
        </div>
        {isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="shimmer h-16 rounded-[20px] bg-brand-100" />
            ))}
          </div>
        ) : courierStats.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-stone-500">No shipment data yet.</p>
        ) : (
          <div className="divide-y divide-brand-100/40">
            <div className="grid grid-cols-6 gap-4 px-6 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-400">
              <div className="col-span-2">Courier</div>
              <div className="text-right">Total</div>
              <div className="text-right">Delivered</div>
              <div className="text-right">Delivery %</div>
              <div className="text-right">RTO %</div>
            </div>
            {courierStats.map((c) => (
              <div key={c.carrier} className="grid grid-cols-6 items-center gap-4 px-6 py-4">
                <div className="col-span-2">
                  <p className="font-semibold text-brand-900">{c.carrier}</p>
                  <p className="text-xs text-stone-400">{c.failed} failed · {c.rto} RTO</p>
                </div>
                <p className="text-right text-sm font-semibold text-brand-900">{c.total}</p>
                <p className="text-right text-sm font-semibold text-emerald-700">{c.delivered}</p>
                <div className="text-right">
                  <p className={cn("text-sm font-semibold",
                    c.deliveryRate >= 90 ? "text-emerald-700" :
                    c.deliveryRate >= 70 ? "text-amber-700" : "text-rose-700"
                  )}>{c.deliveryRate}%</p>
                  <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-brand-100">
                    <div
                      className={cn("h-full rounded-full",
                        c.deliveryRate >= 90 ? "bg-emerald-500" :
                        c.deliveryRate >= 70 ? "bg-amber-400" : "bg-rose-400"
                      )}
                      style={{ width: `${c.deliveryRate}%` }}
                    />
                  </div>
                </div>
                <p className={cn("text-right text-sm font-semibold",
                  c.rtoRate <= 5 ? "text-emerald-700" :
                  c.rtoRate <= 15 ? "text-amber-700" : "text-rose-700"
                )}>{c.rtoRate}%</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
