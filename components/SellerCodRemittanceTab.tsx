"use client";

import { useCallback, useEffect, useState } from "react";
import { buttonStyles } from "@/components/Button";
import { useToast } from "@/components/ToastProvider";
import { cn, formatCurrency, getFriendlyErrorMessage } from "@/lib/utils";

type Remittance = {
  _id: string;
  providerRemittanceId?: string;
  amount: number;
  remittanceStatus: "pending" | "processing" | "paid" | "on_hold" | "failed";
  payoutDate?: string;
  utr?: string;
  awbList?: string[];
};

type Totals = { pending: number; processing: number; paid: number; onHold: number; failed: number };

const STATUS: Record<Remittance["remittanceStatus"], string> = {
  pending: "bg-amber-100 text-amber-700",
  processing: "bg-blue-100 text-blue-700",
  paid: "bg-green-100 text-green-700",
  on_hold: "bg-orange-100 text-orange-700",
  failed: "bg-red-100 text-red-700",
};

const ZERO: Totals = { pending: 0, processing: 0, paid: 0, onHold: 0, failed: 0 };

export function SellerCodRemittanceTab() {
  const { toast } = useToast();
  const [rows, setRows] = useState<Remittance[]>([]);
  const [totals, setTotals] = useState<Totals>(ZERO);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/seller/cod-remittance", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setRows(data.remittances ?? []);
      setTotals(data.totals ?? ZERO);
    } catch (e) {
      toast({ variant: "error", title: "Failed to load remittances", description: getFriendlyErrorMessage(e) });
    } finally { setLoading(false); }
  }, [toast]);

  useEffect(() => { void load(); }, [load]);

  return (
    <div className="surface-elevated space-y-5 p-6 sm:p-8">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold text-brand-900">COD Remittance</h3>
          <p className="mt-1 text-sm text-stone-500">Cash-on-delivery payouts from Shiprocket. Synced weekly.</p>
        </div>
        <button onClick={() => void load()} className={buttonStyles({ variant: "secondary", size: "sm" })}>Refresh</button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card label="Pending" amount={totals.pending} />
        <Card label="Processing" amount={totals.processing} />
        <Card label="Paid" amount={totals.paid} />
        <Card label="On hold" amount={totals.onHold} />
      </div>

      {loading ? <p className="text-sm text-stone-500">Loading…</p>
        : rows.length === 0 ? <p className="rounded-2xl bg-stone-50 p-6 text-center text-sm text-stone-500">No remittance records yet.</p>
        : <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-stone-200 text-xs font-semibold uppercase text-stone-500">
                  <th className="px-3 py-2">Remittance ID</th>
                  <th className="px-3 py-2">Amount</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Payout date</th>
                  <th className="px-3 py-2">UTR</th>
                  <th className="px-3 py-2">AWBs</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r._id} className="border-b border-stone-100">
                    <td className="px-3 py-2 font-mono text-xs">{r.providerRemittanceId ?? "—"}</td>
                    <td className="px-3 py-2 font-semibold text-brand-900">{formatCurrency(r.amount)}</td>
                    <td className="px-3 py-2">
                      <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase", STATUS[r.remittanceStatus])}>
                        {r.remittanceStatus.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-xs">{r.payoutDate ? new Date(r.payoutDate).toLocaleDateString() : "—"}</td>
                    <td className="px-3 py-2 font-mono text-xs">{r.utr ?? "—"}</td>
                    <td className="px-3 py-2 text-xs">{r.awbList?.length ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
      }
    </div>
  );
}

function Card({ label, amount }: { label: string; amount: number }) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-stone-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-brand-900">{formatCurrency(amount)}</p>
    </div>
  );
}
