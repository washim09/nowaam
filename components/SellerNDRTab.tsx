"use client";

import { useCallback, useEffect, useState } from "react";
import { buttonStyles } from "@/components/Button";
import { useToast } from "@/components/ToastProvider";
import { cn, getFriendlyErrorMessage } from "@/lib/utils";

type NDR = {
  _id: string;
  orderId: string;
  awbNumber: string;
  attemptCount: number;
  lastAttemptDate?: string;
  reason: string;
  location?: string;
  ndrStatus: "pending" | "action_taken" | "resolved" | "cancelled" | "rto_initiated";
};

const STATUS: Record<NDR["ndrStatus"], string> = {
  pending: "bg-red-100 text-red-700",
  action_taken: "bg-amber-100 text-amber-700",
  rto_initiated: "bg-orange-100 text-orange-700",
  resolved: "bg-green-100 text-green-700",
  cancelled: "bg-stone-200 text-stone-600",
};

export function SellerNDRTab() {
  const { toast } = useToast();
  const [ndrs, setNdrs] = useState<NDR[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [action, setAction] = useState<"reattempt" | "rto" | "edit_address">("reattempt");
  const [comment, setComment] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/seller/ndr", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setNdrs(data.ndrs ?? []);
    } catch (e) {
      toast({ variant: "error", title: "Failed to load NDRs", description: getFriendlyErrorMessage(e) });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { void load(); }, [load]);

  const submit = async (id: string) => {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/seller/ndr/${id}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, comment, phone, address }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast({ variant: "success", title: "Action submitted", description: data.message });
      setExpandedId(null);
      setComment(""); setPhone(""); setAddress("");
      void load();
    } catch (e) {
      toast({ variant: "error", title: "Failed", description: getFriendlyErrorMessage(e) });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="surface-elevated space-y-4 p-6 sm:p-8">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold text-brand-900">Non-Delivery Reports</h3>
          <p className="mt-1 text-sm text-stone-500">Take action on failed delivery attempts.</p>
        </div>
        <button onClick={() => void load()} className={buttonStyles({ variant: "secondary", size: "sm" })}>Refresh</button>
      </div>
      {loading ? (
        <p className="text-sm text-stone-500">Loading…</p>
      ) : ndrs.length === 0 ? (
        <p className="rounded-2xl bg-stone-50 p-6 text-center text-sm text-stone-500">No NDR cases.</p>
      ) : (
        <div className="space-y-3">
          {ndrs.map((n) => (
            <div key={n._id} className="rounded-2xl border border-stone-200 bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-brand-900">AWB {n.awbNumber}</span>
                    <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase", STATUS[n.ndrStatus])}>
                      {n.ndrStatus.replace(/_/g, " ")}
                    </span>
                    <span className="text-xs text-stone-500">Attempt #{n.attemptCount}</span>
                  </div>
                  <p className="mt-2 text-sm text-stone-700">{n.reason}</p>
                  <p className="mt-1 text-[11px] text-stone-400">
                    Order {String(n.orderId).slice(-8)} · {n.lastAttemptDate ? new Date(n.lastAttemptDate).toLocaleString() : "—"}
                  </p>
                </div>
                {(n.ndrStatus === "pending" || n.ndrStatus === "action_taken") && (
                  <button onClick={() => setExpandedId(expandedId === n._id ? null : n._id)}
                    className={buttonStyles({ variant: "primary", size: "sm" })}>
                    {expandedId === n._id ? "Cancel" : "Take action"}
                  </button>
                )}
              </div>
              {expandedId === n._id && (
                <div className="mt-4 space-y-3 border-t pt-4">
                  <select value={action} onChange={(e) => setAction(e.target.value as typeof action)}
                    className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm">
                    <option value="reattempt">Re-attempt delivery</option>
                    <option value="edit_address">Update phone/address & re-attempt</option>
                    <option value="rto">Return to origin (RTO)</option>
                  </select>
                  {action === "edit_address" && (
                    <>
                      <input placeholder="New phone (optional)" value={phone} onChange={(e) => setPhone(e.target.value)}
                        className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm" />
                      <input placeholder="New address (optional)" value={address} onChange={(e) => setAddress(e.target.value)}
                        className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm" />
                    </>
                  )}
                  <textarea placeholder="Note to courier (optional)" value={comment} onChange={(e) => setComment(e.target.value)}
                    rows={2} className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm" />
                  <button onClick={() => void submit(n._id)} disabled={submitting}
                    className={buttonStyles({ variant: "primary", size: "sm" })}>
                    {submitting ? "Submitting…" : "Submit to courier"}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
