import { NextRequest, NextResponse } from "next/server";

import { connectToDatabase } from "@/lib/db";
import { logger, newRequestId } from "@/lib/logger";
import { processTrackingUpdate } from "@/lib/shipping/process-tracking-update";
import Shipment from "@/models/Shipment";

export const runtime = "nodejs";

// Generic courier webhook endpoint. Renamed from /webhooks/shiprocket because
// Shiprocket rejects webhook URLs containing keywords like "shiprocket",
// "kartrocket", "sr", or "kr". Endpoint behavior is unchanged.

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
  const log = logger.child({ route: "webhooks/courier-sync", requestId: newRequestId() });
  try {
    // Shiprocket sends the token via the header named in their "Auth Token Type"
    // dropdown — default is x-api-key. We accept either for safety.
    const providedToken =
      request.headers.get("x-api-key") ??
      request.headers.get("x-shiprocket-token") ??
      "";
    const expected = process.env.SHIPROCKET_WEBHOOK_TOKEN ?? "";

    if (expected && providedToken !== expected) {
      log.warn("webhook.unauthorized");
      return NextResponse.json({ error: "Invalid webhook token." }, { status: 401 });
    }

    const payload = (await request.json()) as ShiprocketWebhookPayload;
    if (!payload.awb) {
      return NextResponse.json({ received: true });
    }

    await connectToDatabase();

    const shipment = await Shipment.findOne({
      $or: [
        { awbNumber: payload.awb },
        { providerOrderId: String(payload.order_id) },
      ],
    });

    if (!shipment) {
      log.warn("webhook.shipment_not_found", { awb: payload.awb, orderId: payload.order_id });
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

    log.info("webhook.processed", {
      awb: payload.awb,
      newStatus,
      shipmentId: String(shipment._id),
    });
    return NextResponse.json({ received: true });
  } catch (error) {
    log.error("webhook.error", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    // Always return 200 to prevent provider retry storms on app errors
    return NextResponse.json({ received: true });
  }
}
