"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { SHIPMENT_TIMELINE_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { ShipmentRecord, TrackingEventRecord } from "@/types";

type TrackingData = {
  shipment: ShipmentRecord;
  events: TrackingEventRecord[];
};

const COURIER_CONTACTS: Record<string, { phone: string; website: string; trackingUrl?: string }> = {
  "FedEx": { phone: "1800-419-4343", website: "https://www.fedex.com/en-in/home.html", trackingUrl: "https://www.fedex.com/fedextrack/" },
  "UPS": { phone: "1800-102-6161", website: "https://www.ups.com/in/en/home.page" },
  "DHL": { phone: "1800-111-345", website: "https://www.dhl.com/in-en/home.html", trackingUrl: "https://www.dhl.com/in-en/home/tracking.html" },
  "Blue Dart": { phone: "1860-233-1234", website: "https://www.bluedart.com", trackingUrl: "https://www.bluedart.com/web/guest/trackdartresult" },
  "Delhivery": { phone: "011-4296-1777", website: "https://www.delhivery.com", trackingUrl: "https://www.delhivery.com/track/" },
  "DTDC": { phone: "1800-10-888-33", website: "https://www.dtdc.in", trackingUrl: "https://www.dtdc.in/tracking/tracking_results.asp" },
  "Ekart": { phone: "1800-208-9898", website: "https://ekartlogistics.com" },
  "Shadowfax": { phone: "1800-123-4677", website: "https://shadowfax.in" },
  "XpressBees": { phone: "020-4941-4900", website: "https://www.xpressbees.com" },
};

function CourierContactCard({ carrier }: { carrier?: string }) {
  const info = carrier ? COURIER_CONTACTS[carrier] ?? null : null;
  return (
    <div className="surface-elevated p-6">
      <h3 className="text-base font-semibold text-brand-900">Need help with your delivery?</h3>
      {info ? (
        <div className="mt-3 flex flex-wrap items-center gap-4">
          <span className="text-xl">📞</span>
          <div className="flex-1">
            <p className="text-sm font-semibold text-brand-900">{carrier} Customer Care</p>
            <p className="mt-0.5 text-sm text-stone-500">{info.phone}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {info.trackingUrl && (
              <a
                href={info.trackingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full bg-brand-50 px-4 py-2 text-xs font-semibold text-brand-700 hover:bg-brand-100"
              >
                Courier Tracking →
              </a>
            )}
            <a
              href={info.website}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full bg-brand-50 px-4 py-2 text-xs font-semibold text-brand-700 hover:bg-brand-100"
            >
              Visit Website
            </a>
          </div>
        </div>
      ) : (
        <p className="mt-2 text-sm text-stone-500">
          Visit your{" "}
          <Link href="/account" className="font-semibold text-brand-700 hover:underline">
            account
          </Link>{" "}
          or contact us at <span className="font-semibold text-brand-900">support@nowaam.com</span>.
        </p>
      )}
    </div>
  );
}

const STATUS_ORDER = [
  "shipment_created",
  "awb_assigned",
  "pickup_scheduled",
  "picked_up",
  "in_transit",
  "reached_hub",
  "out_for_delivery",
  "delivered",
];

function statusIndex(status: string): number {
  const idx = STATUS_ORDER.indexOf(status);
  return idx === -1 ? 0 : idx;
}

function formatDateTime(ts: string) {
  return new Date(ts).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function StatusPill({ status }: { status: string }) {
  const colorMap: Record<string, string> = {
    shipment_created: "bg-brand-50 text-brand-700",
    awb_assigned: "bg-sky-50 text-sky-700",
    pickup_scheduled: "bg-amber-50 text-amber-700",
    picked_up: "bg-amber-50 text-amber-700",
    in_transit: "bg-blue-50 text-blue-700",
    reached_hub: "bg-indigo-50 text-indigo-700",
    out_for_delivery: "bg-orange-50 text-orange-700",
    delivered: "bg-emerald-50 text-emerald-700",
    failed_delivery: "bg-rose-50 text-rose-700",
    returned_to_origin: "bg-stone-100 text-stone-600",
  };
  const label = SHIPMENT_TIMELINE_LABELS[status]?.label ?? status.replace(/_/g, " ");
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em]",
        colorMap[status] ?? "bg-brand-50 text-brand-700",
      )}
    >
      {label}
    </span>
  );
}

function ProgressBar({ status }: { status: string }) {
  if (status === "returned_to_origin" || status === "failed_delivery") {
    return (
      <div className="h-2 w-full overflow-hidden rounded-full bg-rose-100">
        <div className="h-full w-full rounded-full bg-rose-400" />
      </div>
    );
  }
  const pct = Math.min(100, ((statusIndex(status) + 1) / STATUS_ORDER.length) * 100);
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-brand-100">
      <div
        className="h-full rounded-full bg-brand-700 transition-all duration-700"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function TrackingTimeline({
  events,
  currentStatus,
}: {
  events: TrackingEventRecord[];
  currentStatus: string;
}) {
  const sorted = [...events].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );
  const steps = STATUS_ORDER.filter(
    (s) => s !== "awb_assigned" && s !== "pickup_scheduled",
  );
  const currentIdx = statusIndex(currentStatus);

  return (
    <div className="space-y-0">
      {steps.map((step, index) => {
        const stepIdx = statusIndex(step);
        const isDone = stepIdx < currentIdx;
        const isActive = step === currentStatus || stepIdx === currentIdx;
        const isPending = stepIdx > currentIdx;
        const meta = SHIPMENT_TIMELINE_LABELS[step];
        const matchedEvent = sorted.find((e) => e.status === step);
        const isLast = index === steps.length - 1;

        return (
          <div key={step} className="relative flex gap-4">
            {!isLast && (
              <div
                className={cn(
                  "absolute left-[18px] top-10 z-0 w-0.5",
                  isDone ? "bg-brand-700" : "bg-brand-100",
                )}
                style={{ height: "calc(100% - 4px)" }}
              />
            )}
            <div
              className={cn(
                "relative z-10 mt-0.5 grid h-9 w-9 flex-shrink-0 place-items-center rounded-full border-2 text-xs font-bold transition-all duration-300",
                isDone
                  ? "border-brand-700 bg-brand-700 text-white"
                  : isActive
                    ? "border-brand-500 bg-white text-brand-700 shadow-md"
                    : "border-brand-100 bg-white text-stone-300",
              )}
            >
              {isDone ? (
                <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                  <path
                    d="M2 7l4 4 6-8"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              ) : (
                <span>{index + 1}</span>
              )}
            </div>
            <div className={cn("pb-7 pt-0.5", isPending && "opacity-40")}>
              <div className="flex flex-wrap items-center gap-2">
                <p
                  className={cn(
                    "font-semibold",
                    isActive ? "text-brand-700" : "text-brand-900",
                  )}
                >
                  {meta?.label ?? step.replace(/_/g, " ")}
                </p>
                {isActive && (
                  <span className="inline-flex rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-700">
                    Current
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-sm text-stone-500">{meta?.description}</p>
              {matchedEvent && (
                <p className="mt-1 text-xs text-stone-400">
                  {formatDateTime(matchedEvent.timestamp)}
                  {matchedEvent.location ? ` · ${matchedEvent.location}` : ""}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function TrackingPage() {
  const { trackingId } = useParams<{ trackingId: string }>();
  const [data, setData] = useState<TrackingData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLive, setIsLive] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  const fetchTracking = useCallback(async () => {
    if (!trackingId) return;
    try {
      const res = await fetch(`/api/track/${trackingId}`);
      const json = (await res.json()) as {
        error?: string;
        shipment?: ShipmentRecord;
        events?: TrackingEventRecord[];
      };
      if (!res.ok) throw new Error(json.error ?? "Not found");
      if (json.shipment && json.events) {
        setData({ shipment: json.shipment, events: json.events });
        setLastUpdated(new Date());
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Tracking not found.");
    } finally {
      setIsLoading(false);
    }
  }, [trackingId]);

  useEffect(() => {
    void fetchTracking();
  }, [fetchTracking]);

  useEffect(() => {
    if (!trackingId || !data) return;
    const status = data.shipment.shipmentStatus;
    if (status === "delivered" || status === "returned_to_origin") return;

    const es = new EventSource(`/api/track/${trackingId}/sse`);
    eventSourceRef.current = es;
    setIsLive(true);

    es.addEventListener("update", (e) => {
      try {
        const parsed = JSON.parse(e.data) as {
          shipmentStatus: string;
          estimatedDeliveryDate?: string;
          events: TrackingEventRecord[];
        };
        setData((prev) =>
          prev
            ? {
                ...prev,
                shipment: {
                  ...prev.shipment,
                  shipmentStatus: parsed.shipmentStatus as ShipmentRecord["shipmentStatus"],
                  estimatedDeliveryDate: parsed.estimatedDeliveryDate,
                },
                events: parsed.events,
              }
            : prev,
        );
        setLastUpdated(new Date());
      } catch (_) {}
    });

    es.addEventListener("done", () => {
      es.close();
      setIsLive(false);
    });

    es.onerror = () => setIsLive(false);

    return () => {
      es.close();
      setIsLive(false);
    };
  }, [trackingId, data?.shipment.shipmentStatus]);

  if (isLoading) {
    return (
      <div className="section-shell py-16">
        <div className="mx-auto max-w-2xl space-y-6">
          <div className="shimmer h-8 w-48 rounded-full bg-brand-100" />
          <div className="surface-elevated p-8">
            <div className="shimmer mb-4 h-6 w-64 rounded-full bg-brand-100" />
            <div className="shimmer mb-6 h-3 w-full rounded-full bg-brand-100" />
            <div className="space-y-6">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex gap-4">
                  <div className="shimmer h-9 w-9 flex-shrink-0 rounded-full bg-brand-100" />
                  <div className="flex-1 space-y-2 pt-1">
                    <div className="shimmer h-4 w-32 rounded-full bg-brand-100" />
                    <div className="shimmer h-3 w-48 rounded-full bg-brand-100" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="section-shell py-20">
        <div className="mx-auto max-w-md text-center">
          <div className="mx-auto mb-6 grid h-16 w-16 place-items-center rounded-[28px] bg-rose-50 text-2xl">
            📦
          </div>
          <h1 className="text-3xl font-semibold tracking-[-0.05em] text-brand-900">
            Tracking not found
          </h1>
          <p className="mt-3 text-sm leading-6 text-stone-500">
            {error ?? "No shipment found for this tracking ID. Check the number and try again."}
          </p>
          <Link
            href="/"
            className="mt-6 inline-flex rounded-full bg-brand-700 px-6 py-3 text-sm font-semibold text-white hover:bg-brand-800"
          >
            Go home
          </Link>
        </div>
      </div>
    );
  }

  const { shipment, events } = data;
  const isDelivered = shipment.shipmentStatus === "delivered";
  const isRTO = shipment.shipmentStatus === "returned_to_origin";
  const isFailed = shipment.shipmentStatus === "failed_delivery";

  return (
    <div className="section-shell py-8 pb-20">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <span className="eyebrow">Order Tracking</span>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-brand-900 sm:text-4xl">
              Track Shipment
            </h1>
          </div>
          {isLive && (
            <div className="flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
              Live
            </div>
          )}
        </div>

        <div className="surface-elevated overflow-hidden p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-brand-500">
                AWB / Tracking ID
              </p>
              <p className="mt-1 font-mono text-lg font-semibold text-brand-900">
                {shipment.awbNumber ?? trackingId}
              </p>
              {shipment.carrier && (
                <p className="mt-1 text-sm text-stone-500">
                  {shipment.carrier} · {shipment.service ?? "Standard"}
                </p>
              )}
            </div>
            <StatusPill status={shipment.shipmentStatus} />
          </div>

          <div className="mt-6">
            <ProgressBar status={shipment.shipmentStatus} />
          </div>

          {shipment.estimatedDeliveryDate && !isDelivered && !isRTO && (
            <div className="mt-4 flex items-center gap-3 rounded-[20px] bg-brand-50/60 px-4 py-3">
              <span className="text-lg">📅</span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-500">
                  Estimated Delivery
                </p>
                <p className="mt-0.5 text-sm font-semibold text-brand-900">
                  {new Date(shipment.estimatedDeliveryDate).toLocaleDateString("en-IN", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                  })}
                </p>
              </div>
            </div>
          )}

          {isDelivered && (
            <div className="mt-4 rounded-[20px] bg-emerald-50 px-4 py-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl">✅</span>
                <div>
                  <p className="font-semibold text-emerald-800">Package Delivered!</p>
                  <p className="mt-0.5 text-sm text-emerald-700">
                    Your order has been delivered successfully.
                  </p>
                </div>
              </div>
            </div>
          )}

          {(isRTO || isFailed) && (
            <div className="mt-4 rounded-[20px] bg-rose-50 px-4 py-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{isRTO ? "🔄" : "⚠️"}</span>
                <div>
                  <p className="font-semibold text-rose-800">
                    {isRTO ? "Return to Origin" : "Delivery Attempt Failed"}
                  </p>
                  <p className="mt-0.5 text-sm text-rose-700">
                    {isRTO
                      ? "Package is being returned to the seller."
                      : "Courier attempted delivery but was unsuccessful. Another attempt will be made."}
                  </p>
                </div>
              </div>
            </div>
          )}

          {shipment.deliveryAddress && (
            <div className="mt-4 flex items-center gap-3 rounded-[20px] bg-brand-50/40 px-4 py-3">
              <span className="text-lg">📍</span>
              <p className="text-sm text-stone-600">
                Delivering to:{" "}
                <span className="font-semibold text-brand-900">
                  {[
                    (shipment.deliveryAddress as Record<string, unknown>).city,
                    (shipment.deliveryAddress as Record<string, unknown>).state,
                  ]
                    .filter(Boolean)
                    .join(", ")}
                </span>
              </p>
            </div>
          )}
        </div>

        <div className="surface-elevated p-6 sm:p-8">
          <h2 className="mb-6 text-xl font-semibold tracking-[-0.04em] text-brand-900">
            Delivery Timeline
          </h2>
          <TrackingTimeline events={events} currentStatus={shipment.shipmentStatus} />
        </div>

        {events.length > 0 && (
          <div className="surface-elevated overflow-hidden">
            <div className="border-b border-brand-100/60 px-6 py-4">
              <h2 className="text-xl font-semibold tracking-[-0.04em] text-brand-900">
                Event Log
              </h2>
            </div>
            <div className="divide-y divide-brand-100/40">
              {[...events]
                .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                .map((event, i) => (
                  <div key={i} className="flex gap-4 px-6 py-4">
                    <div className="mt-0.5 grid h-8 w-8 flex-shrink-0 place-items-center rounded-full bg-brand-50">
                      <span className="text-[10px] font-bold text-brand-700">
                        {(events.length - i).toString().padStart(2, "0")}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-brand-900">
                        {SHIPMENT_TIMELINE_LABELS[event.status]?.label ??
                          event.status.replace(/_/g, " ")}
                      </p>
                      <p className="mt-0.5 text-sm text-stone-500">{event.description}</p>
                      <p className="mt-1 text-xs text-stone-400">
                        {formatDateTime(event.timestamp)}
                        {event.location ? ` · ${event.location}` : ""}
                      </p>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {lastUpdated && (
          <p className="text-center text-xs text-stone-400">
            Last updated: {lastUpdated.toLocaleTimeString("en-IN")}
            {isLive ? " · Auto-refreshing" : ""}
          </p>
        )}

        <CourierContactCard carrier={shipment.carrier} />
      </div>
    </div>
  );
}
