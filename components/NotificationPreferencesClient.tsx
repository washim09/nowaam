"use client";

import { useCallback, useEffect, useState } from "react";
import { buttonStyles } from "@/components/Button";
import { useToast } from "@/components/ToastProvider";
import { cn, getFriendlyErrorMessage } from "@/lib/utils";

type Channel = "inApp" | "email" | "sms" | "whatsapp";
type Category =
  | "orderUpdates" | "shipmentUpdates" | "paymentUpdates"
  | "returnUpdates" | "deliveryAlerts" | "marketing";
type Toggle = Partial<Record<Channel, boolean>>;
type Prefs = Record<Category, Toggle> & {
  smsOptOut?: boolean; whatsappOptOut?: boolean; emailOptOut?: boolean;
};

const CATS: Array<{ k: Category; label: string; desc: string }> = [
  { k: "orderUpdates", label: "Order updates", desc: "Placed, confirmed, processing." },
  { k: "shipmentUpdates", label: "Shipment updates", desc: "Shipped, in transit, delivered." },
  { k: "deliveryAlerts", label: "Delivery alerts", desc: "Out for delivery, failed (NDR)." },
  { k: "paymentUpdates", label: "Payment", desc: "Success, refunds." },
  { k: "returnUpdates", label: "Returns", desc: "Approved, refund initiated." },
  { k: "marketing", label: "Marketing", desc: "Promotions." },
];
const CHS: Channel[] = ["inApp", "email", "sms", "whatsapp"];

export function NotificationPreferencesClient() {
  const { toast } = useToast();
  const [prefs, setPrefs] = useState<Prefs | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/user/notification-preferences", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPrefs(data.preferences);
    } catch (e) {
      toast({ variant: "error", title: "Failed to load", description: getFriendlyErrorMessage(e) });
    } finally { setLoading(false); }
  }, [toast]);

  useEffect(() => { void load(); }, [load]);

  const toggle = (c: Category, ch: Channel) => {
    if (!prefs) return;
    const cur = prefs[c]?.[ch] ?? true;
    setPrefs({ ...prefs, [c]: { ...prefs[c], [ch]: !cur } });
  };

  const save = async () => {
    if (!prefs) return;
    setSaving(true);
    try {
      const res = await fetch("/api/user/notification-preferences", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(prefs),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPrefs(data.preferences);
      toast({ variant: "success", title: "Preferences saved" });
    } catch (e) {
      toast({ variant: "error", title: "Failed to save", description: getFriendlyErrorMessage(e) });
    } finally { setSaving(false); }
  };

  if (loading || !prefs) return <div className="surface-elevated p-8 text-sm text-stone-500">Loading…</div>;

  return (
    <div className="space-y-6">
      <div className="surface-elevated p-6 sm:p-8">
        <h2 className="text-2xl font-semibold text-brand-900">Notification preferences</h2>
        <p className="mt-2 text-sm text-stone-500">Choose how we reach you for each event type.</p>
      </div>
      <div className="surface-elevated overflow-x-auto p-0">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-stone-200 bg-stone-50 text-xs font-semibold uppercase text-stone-500">
              <th className="px-4 py-3">Category</th>
              {CHS.map((c) => <th key={c} className="px-4 py-3 text-center capitalize">{c === "inApp" ? "In-app" : c}</th>)}
            </tr>
          </thead>
          <tbody>
            {CATS.map((cat) => (
              <tr key={cat.k} className="border-b border-stone-100">
                <td className="px-4 py-3">
                  <p className="font-semibold text-brand-900">{cat.label}</p>
                  <p className="text-xs text-stone-500">{cat.desc}</p>
                </td>
                {CHS.map((ch) => {
                  const on = prefs[cat.k]?.[ch] ?? (cat.k !== "marketing");
                  return (
                    <td key={ch} className="px-4 py-3 text-center">
                      <button onClick={() => toggle(cat.k, ch)} className={cn(
                        "inline-flex h-6 w-11 items-center rounded-full transition",
                        on ? "bg-brand-600" : "bg-stone-300",
                      )}>
                        <span className={cn(
                          "inline-block h-5 w-5 transform rounded-full bg-white transition",
                          on ? "translate-x-5" : "translate-x-0.5",
                        )} />
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="surface-elevated space-y-3 p-6 sm:p-8">
        <h3 className="text-lg font-semibold text-brand-900">Channel kill switches</h3>
        {(["smsOptOut", "whatsappOptOut", "emailOptOut"] as const).map((k) => (
          <label key={k} className="flex items-center justify-between rounded-2xl border border-stone-200 px-4 py-3">
            <span className="text-sm font-medium text-stone-700">
              {k === "smsOptOut" ? "Stop all SMS" : k === "whatsappOptOut" ? "Stop all WhatsApp" : "Stop all email"}
            </span>
            <input type="checkbox" checked={!!prefs[k]} onChange={() => setPrefs({ ...prefs, [k]: !prefs[k] })}
              className="h-5 w-5 rounded border-stone-300" />
          </label>
        ))}
      </div>
      <div className="flex justify-end">
        <button onClick={() => void save()} disabled={saving} className={buttonStyles({ variant: "primary" })}>
          {saving ? "Saving…" : "Save preferences"}
        </button>
      </div>
    </div>
  );
}
