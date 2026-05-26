import { NextRequest, NextResponse } from "next/server";

import { connectToDatabase } from "@/lib/db";
import { processTrackingUpdate } from "@/lib/shipping/process-tracking-update";
import Shipment from "@/models/Shipment";

export const runtime = "nodejs";

// Shiprocket webhook payload (per https://apidocs.shiprocket.in/#webhook)
type ShiprocketWebhookPayload = {
  awb: string;
  current_status: string;
  current_timestamp: string;
  order_id: string | number;
  current_status_id?: number;
  shipment_status?: string;
  channel_order_id?: string;
  courier_name?: string;
  edd?: string;
  scans?: Array<{
    date: string;
    activity: string;
    location?: string;
    "sr-status"?: string;
    "sr-status-label"?: string;
  }>;
};

function mapShiprocketStatus(status: string): string {
  const s = status.toLowerCase();
  if (s.includes("delivered")) return "delivered";
  if (s.includes("out for delivery")) return "out_for_delivery";
  if (s.includes("rto") || s.includes("returned")) return "returned_to_origin";
  if (s.includes("failed") || s.includes("undelivered") || s.includes("ndr"))
    return "failed_delivery";
  if (s.includes("picked up") || s.includes("pickup")) return "picked_up";
  if (s.includes("in transit") || s.includes("intransit")) return "in_transit";
  if (s.includes("reached") || s.includes("at destination")) return "reached_hub";
  if (s.includes("awb") || s.includes("manifested")) return "awb_assigned";
  return "in_transit";
}

export async function POST(request: NextRequest) {
  try {
    // ── Auth: Shiprocket sends X-Api-Key with the token you configured
    // in their dashboard (Settings → Webhooks → Token field)
    const providedToken =
      request.headers.get("x-api-key") ??
      request.headers.get("x-shiprocket-token") ??
      "";
    const expected = process.env.SHIPROCKET_WEBHOOK_TOKEN ?? "";

    if (expected && providedToken !== expected) {
      return NextResponse.json({ error: "Invalid webhook token." }, { status: 401 });
    }

    const payload = (await request.json()) as ShiprocketWebhookPayload;
    if (!payload.awb) {
      return NextResponse.json({ received: true });
    }

    await connectToDatabase();

    // Match shipment by AWB; fallback to providerOrderId
    const shipment = await Shipment.findOne({
      $or: [
        { awbNumber: payload.awb },
        { providerOrderId: String(payload.order_id) },
      ],
    });

    if (!shipment) {
      console.warn(`[Shiprocket Webhook] No shipment found for AWB ${payload.awb}`);
      return NextResponse.json({ received: true });
    }

    const newStatus = mapShiprocketStatus(payload.current_status);
    const eventTimestamp = payload.current_timestamp
      ? new Date(payload.current_timestamp)
      : new Date();
    const latestScan = payload.scans?.[payload.scans.length - 1];

    await processTrackingUpdate({
      shipment,
      newStatus,
      description: latestScan?.activity ?? payload.current_status,
      location: latestScan?.location,
      timestamp: eventTimestamp,
      source: "webhook",
      rawPayload: payload,
      carrierName: payload.courier_name,
      estimatedDeliveryDate: payload.edd ? new Date(payload.edd) : undefined,
    });

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[Shiprocket Webhook]", error);
    // Return 200 to prevent Shiprocket from retrying on application errors
    return NextResponse.json({ received: true });
  }
}
