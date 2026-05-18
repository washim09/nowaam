"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { buttonStyles } from "@/components/Button";
import { useToast } from "@/components/ToastProvider";
import { cn, formatCurrency, getFriendlyErrorMessage } from "@/lib/utils";
import type { ReturnRecord, ReturnStatus } from "@/types";

type ReturnFilter = "all" | "requested" | "approved" | "rejected" | "refund_initiated" | "refund_completed";

const FILTER_LABELS: Record<ReturnFilter, string> = {
  all: "All",
  requested: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  refund_initiated: "Refund Initiated",
  refund_completed: "Refund Completed",
};

const REASON_LABELS: Record<string, string> = {
  damaged: "Damaged on arrival",
  wrong_item: "Wrong item received",
  not_as_described: "Not as described",
  quality_issue: "Quality issue",
  changed_mind: "Changed my mind",
  duplicate_order: "Duplicate order",
  other: "Other",
};

function statusPill(status: ReturnStatus) {
  const colorMap: Record<string, string> = {
    requested: "bg-amber-50 text-amber-700",
    approved: "bg-emerald-50 text-emerald-700",
    rejected: "bg-rose-50 text-rose-700",
    pickup_scheduled: "bg-sky-50 text-sky-700",
    picked_up: "bg-blue-50 text-blue-700",
    in_transit: "bg-indigo-50 text-indigo-700",
    received: "bg-violet-50 text-violet-700",
    inspected: "bg-violet-50 text-violet-700",
    refund_initiated: "bg-amber-50 text-amber-700",
    refund_completed: "bg-emerald-50 text-emerald-700",
    closed: "bg-stone-100 text-stone-600",
  };
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em]",
        colorMap[status] ?? "bg-brand-50 text-brand-700",
      )}
    >
      {status.replace(/_/g, " ")}
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

export function SellerReturnsTab() {
  const { toast } = useToast();
  const [returns, setReturns] = useState<ReturnRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<ReturnFilter>("all");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [activeReturn, setActiveReturn] = useState<ReturnRecord | null>(null);
  const [actionForm, setActionForm] = useState<{
    action: "approve" | "reject" | "initiate_refund" | "complete_refund";
    note: string;
    refundAmount: string;
    refundTransactionId: string;
  }>({ action: "approve", note: "", refundAmount: "", refundTransactionId: "" });

  const loadReturns = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/returns", { cache: "no-store" });
      const data = (await res.json()) as { returns?: ReturnRecord[]; error?: string };
      if (!res.ok) throw new Error(data.error);
      setReturns(data.returns ?? []);
    } catch (e) {
      toast({ variant: "error", title: "Failed to load returns", description: getFriendlyErrorMessage(e) });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void loadReturns();
  }, [loadReturns]);

  const filtered = useMemo(() => {
    if (filter === "all") return returns;
    return returns.filter((r) => r.returnStatus === filter);
  }, [filter, returns]);

  const stats = useMemo(
    () => ({
      total: returns.length,
      pending: returns.filter((r) => r.returnStatus === "requested").length,
      approved: returns.filter((r) =>
        ["approved", "pickup_scheduled", "picked_up", "in_transit", "received", "inspected"].includes(
          r.returnStatus,
        ),
      ).length,
      refunded: returns.filter((r) => r.returnStatus === "refund_completed").length,
    }),
    [returns],
  );

  const openAction = (ret: ReturnRecord, action: typeof actionForm.action) => {
    setActiveReturn(ret);
    setActionForm({
      action,
      note: "",
      refundAmount: action === "initiate_refund" ? "" : "",
      refundTransactionId: "",
    });
  };

  const submitAction = async () => {
    if (!activeReturn) return;
    const { action, note, refundAmount, refundTransactionId } = actionForm;
    if (action === "initiate_refund" && (!refundAmount || parseFloat(refundAmount) <= 0)) {
      toast({ variant: "error", title: "Refund amount required" });
      return;
    }

    setUpdatingId(activeReturn._id);
    try {
      const body: Record<string, unknown> = { action };
      if (note) body.adminNote = note;
      if (action === "initiate_refund") body.refundAmount = parseFloat(refundAmount);
      if (action === "complete_refund" && refundTransactionId) {
        body.refundTransactionId = refundTransactionId;
      }

      const res = await fetch(`/api/returns/${activeReturn._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as { return?: ReturnRecord; error?: string };
      if (!res.ok) throw new Error(data.error);

      toast({
        variant: "success",
        title: {
          approve: "Return approved",
          reject: "Return rejected",
          initiate_refund: "Refund initiated",
          complete_refund: "Refund completed",
        }[action],
      });
      setActiveReturn(null);
      void loadReturns();
    } catch (e) {
      toast({ variant: "error", title: "Action failed", description: getFriendlyErrorMessage(e) });
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total Returns", value: stats.total, dark: false },
          { label: "Pending Review", value: stats.pending, dark: false },
          { label: "Approved / In Progress", value: stats.approved, dark: false },
          { label: "Refunded", value: stats.refunded, dark: true },
        ].map((s) => (
          <div key={s.label} className={s.dark ? "surface-dark p-5" : "surface-elevated p-5"}>
            <p
              className={cn(
                "text-[11px] uppercase tracking-[0.18em]",
                s.dark ? "text-white/60" : "text-brand-500",
              )}
            >
              {s.label}
            </p>
            <p
              className={cn(
                "mt-3 text-4xl font-semibold tracking-[-0.05em]",
                !s.dark && "text-brand-900",
              )}
            >
              {s.value}
            </p>
          </div>
        ))}
      </div>

      <div className="surface-elevated overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-brand-100/60 px-6 py-4">
          <h3 className="text-xl font-semibold tracking-[-0.04em] text-brand-900">All Returns</h3>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(FILTER_LABELS) as ReturnFilter[]).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition",
                  filter === f
                    ? "bg-brand-700 text-white"
                    : "border border-white/85 bg-white/75 text-brand-700 hover:bg-white",
                )}
              >
                {FILTER_LABELS[f]}
                <span
                  className={cn(
                    "ml-0.5 text-[10px]",
                    filter === f ? "opacity-70" : "opacity-50",
                  )}
                >
                  {f === "all" ? returns.length : returns.filter((r) => r.returnStatus === f).length}
                </span>
              </button>
            ))}
            <button
              type="button"
              onClick={() => void loadReturns()}
              className={buttonStyles({ variant: "secondary", size: "sm" })}
            >
              Refresh
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="px-6 py-12 text-center text-sm text-stone-500">Loading returns…</div>
        ) : filtered.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-sm text-stone-500">
              No return requests {filter !== "all" ? `with status "${FILTER_LABELS[filter]}"` : "yet"}.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-brand-100/60">
            {filtered.map((ret) => (
              <li key={ret._id} className="px-6 py-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {statusPill(ret.returnStatus)}
                      <span className="text-[11px] uppercase tracking-[0.18em] text-brand-500">
                        {REASON_LABELS[ret.reason] ?? ret.reason}
                      </span>
                    </div>
                    <p className="mt-2 font-mono text-xs text-stone-500">
                      Order #{ret.orderId.slice(-8)} · Return #{ret._id.slice(-8)}
                    </p>
                    {ret.description && (
                      <p className="mt-2 text-sm leading-6 text-stone-700">{ret.description}</p>
                    )}
                    {ret.images && ret.images.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {ret.images.map((img, i) => (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            key={i}
                            src={img}
                            alt={`Return evidence ${i + 1}`}
                            className="h-16 w-16 rounded-lg border border-brand-100 object-cover"
                          />
                        ))}
                      </div>
                    )}
                    <p className="mt-3 text-xs text-stone-500">
                      Requested on {formatDate(ret.createdAt)}
                      {ret.refundAmount ? ` · Refund ${formatCurrency(ret.refundAmount)}` : ""}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {ret.returnStatus === "requested" && (
                      <>
                        <button
                          type="button"
                          disabled={updatingId === ret._id}
                          onClick={() => openAction(ret, "approve")}
                          className={buttonStyles({ size: "sm" })}
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          disabled={updatingId === ret._id}
                          onClick={() => openAction(ret, "reject")}
                          className={buttonStyles({ variant: "secondary", size: "sm" })}
                        >
                          Reject
                        </button>
                      </>
                    )}
                    {(ret.returnStatus === "approved" ||
                      ret.returnStatus === "received" ||
                      ret.returnStatus === "inspected") && (
                      <button
                        type="button"
                        disabled={updatingId === ret._id}
                        onClick={() => openAction(ret, "initiate_refund")}
                        className={buttonStyles({ size: "sm" })}
                      >
                        Initiate Refund
                      </button>
                    )}
                    {ret.returnStatus === "refund_initiated" && (
                      <button
                        type="button"
                        disabled={updatingId === ret._id}
                        onClick={() => openAction(ret, "complete_refund")}
                        className={buttonStyles({ size: "sm" })}
                      >
                        Mark Refunded
                      </button>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {activeReturn && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setActiveReturn(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-semibold tracking-[-0.04em] text-brand-900">
              {
                {
                  approve: "Approve return request",
                  reject: "Reject return request",
                  initiate_refund: "Initiate refund",
                  complete_refund: "Mark refund as completed",
                }[actionForm.action]
              }
            </h3>
            <p className="mt-1 text-sm text-stone-500">
              Order #{activeReturn.orderId.slice(-8)} · {REASON_LABELS[activeReturn.reason] ?? activeReturn.reason}
            </p>

            <div className="mt-5 space-y-3">
              {actionForm.action === "initiate_refund" && (
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-500">
                    Refund amount (₹)
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={actionForm.refundAmount}
                    onChange={(e) =>
                      setActionForm((f) => ({ ...f, refundAmount: e.target.value }))
                    }
                    className="rounded-lg border border-brand-100 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
                    placeholder="e.g. 500"
                  />
                </label>
              )}

              {actionForm.action === "complete_refund" && (
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-500">
                    Transaction ID (optional)
                  </span>
                  <input
                    type="text"
                    value={actionForm.refundTransactionId}
                    onChange={(e) =>
                      setActionForm((f) => ({ ...f, refundTransactionId: e.target.value }))
                    }
                    className="rounded-lg border border-brand-100 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
                    placeholder="Razorpay refund ID, UPI ref, etc."
                  />
                </label>
              )}

              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-500">
                  Note to buyer {actionForm.action === "reject" ? "(required)" : "(optional)"}
                </span>
                <textarea
                  value={actionForm.note}
                  onChange={(e) => setActionForm((f) => ({ ...f, note: e.target.value }))}
                  rows={3}
                  className="rounded-lg border border-brand-100 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
                  placeholder={
                    actionForm.action === "approve"
                      ? "We will arrange a pickup soon."
                      : actionForm.action === "reject"
                        ? "Please explain why this return is being rejected."
                        : ""
                  }
                />
              </label>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setActiveReturn(null)}
                className={buttonStyles({ variant: "secondary", size: "sm" })}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={
                  updatingId === activeReturn._id ||
                  (actionForm.action === "reject" && !actionForm.note.trim())
                }
                onClick={() => void submitAction()}
                className={buttonStyles({ size: "sm" })}
              >
                {updatingId === activeReturn._id ? "Submitting…" : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
