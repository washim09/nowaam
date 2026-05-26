import { Types } from "mongoose";

import type { TrackingResult } from "@/lib/shipping/interfaces/ShippingProvider";
import { createNotification, NotificationTemplates } from "@/lib/notifications";
import { sendOutForDeliveryEmail, sendDeliveredEmail } from "@/lib/shipping-emails";
import { sendSms, SMS_TEMPLATES } from "@/lib/sms";
import Order from "@/models/Order";
import Shipment, { type ShipmentDocument } from "@/models/Shipment";
import TrackingEvent from "@/models/TrackingEvent";
import User from "@/models/User";

type ShipmentLike = ShipmentDocument & { _id: Types.ObjectId };

/**
 * Maps an internal shipment status to the corresponding order
 * fulfillmentStatus, or null if the order should not change.
 */
export function mapToFulfillment(shipmentStatus: string): string | null {
  const map: Record<string, string> = {
    picked_up: "shipped",
    in_transit: "shipped",
    reached_hub: "shipped",
    out_for_delivery: "out_for_delivery",
    delivered: "delivered",
    returned_to_origin: "rto",
    failed_delivery: "shipped",
  };
  return map[shipmentStatus] ?? null;
}

const TERMINAL_STATUSES = new Set([
  "delivered",
  "returned_to_origin",
]);

export function isTerminalStatus(status: string): boolean {
  return TERMINAL_STATUSES.has(status);
}

type ProcessUpdateInput = {
  shipment: ShipmentLike;
  newStatus: string;
  description: string;
  location?: string;
  timestamp: Date;
  source: "webhook" | "cron" | "manual";
  rawPayload?: unknown;
  carrierName?: string;
  estimatedDeliveryDate?: Date;
};

type ProcessUpdateResult = {
  statusChanged: boolean;
  eventCreated: boolean;
  notificationsSent: boolean;
};

/**
 * Idempotently processes a single shipment status update.
 *
 * - Inserts a TrackingEvent (deduped by shipmentId+status+timestamp)
 * - Updates Shipment.shipmentStatus + timeline + lastSyncedAt
 * - Cascades to Order.fulfillmentStatus
 * - Fires buyer notifications (in-app + email + SMS) on out_for_delivery
 *   and delivered transitions, but only once per state change
 *
 * Used by both the webhook handler and the scheduled cron sync.
 */
export async function processTrackingUpdate(
  input: ProcessUpdateInput,
): Promise<ProcessUpdateResult> {
  const {
    shipment,
    newStatus,
    description,
    location,
    timestamp,
    source,
    rawPayload,
    carrierName,
    estimatedDeliveryDate,
  } = input;

  const previousStatus = shipment.shipmentStatus;
  const statusChanged = previousStatus !== newStatus;

  // ─── Idempotent tracking event insert ──────────────────────────────
  const existing = await TrackingEvent.findOne({
    shipmentId: shipment._id,
    status: newStatus,
    timestamp,
  });

  let eventCreated = false;
  if (!existing) {
    await TrackingEvent.create({
      shipmentId: shipment._id,
      awbNumber: shipment.awbNumber,
      status: newStatus,
      description,
      location,
      timestamp,
      source,
      rawPayload: rawPayload as Record<string, unknown> | undefined,
    });
    eventCreated = true;
  }

  // ─── Update shipment ───────────────────────────────────────────────
  const shipmentUpdates: Record<string, unknown> = {
    shipmentStatus: newStatus,
    lastSyncedAt: new Date(),
  };
  if (estimatedDeliveryDate) {
    shipmentUpdates.estimatedDeliveryDate = estimatedDeliveryDate;
  }

  if (statusChanged) {
    await Shipment.findByIdAndUpdate(shipment._id, {
      $set: shipmentUpdates,
      $push: {
        timeline: {
          status: newStatus,
          description,
          location,
          timestamp,
        },
      },
    });
  } else {
    // Same status — just refresh lastSyncedAt
    await Shipment.findByIdAndUpdate(shipment._id, { $set: shipmentUpdates });
  }

  // ─── Cascade to order + notifications ──────────────────────────────
  let notificationsSent = false;

  if (!statusChanged || !shipment.orderId) {
    return { statusChanged, eventCreated, notificationsSent };
  }

  const fulfillment = mapToFulfillment(newStatus);
  if (fulfillment) {
    await Order.findByIdAndUpdate(shipment.orderId, {
      $set: { fulfillmentStatus: fulfillment },
      $push: {
        timeline: {
          status: fulfillment,
          description: `Courier update: ${description}`,
          timestamp: new Date(),
          actor: "system",
        },
      },
    });
  }

  // Notifications only fire for "out_for_delivery" and "delivered"
  if (newStatus !== "out_for_delivery" && newStatus !== "delivered") {
    return { statusChanged, eventCreated, notificationsSent };
  }

  const order = await Order.findById(shipment.orderId)
    .select("buyerId deliveryAddress")
    .lean();
  if (!order?.buyerId) {
    return { statusChanged, eventCreated, notificationsSent };
  }

  const buyerId = String(order.buyerId);
  const orderIdStr = String(shipment.orderId);
  const awb = shipment.awbNumber ?? "";
  const buyer = await User.findById(buyerId).select("name email").lean();

  if (newStatus === "out_for_delivery") {
    await createNotification({
      userId: buyerId,
      ...NotificationTemplates.outForDelivery(orderIdStr, awb),
    });
    if (order.deliveryAddress?.phone) {
      void sendSms({
        phone: order.deliveryAddress.phone,
        message: SMS_TEMPLATES.outForDelivery(awb),
      }).catch(() => null);
    }
    if (buyer?.email) {
      void sendOutForDeliveryEmail({
        to: buyer.email,
        buyerName: buyer.name ?? "Customer",
        orderId: orderIdStr,
        awb,
        carrier: carrierName ?? shipment.carrier ?? "",
        trackingUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/track/${awb}`,
      }).catch(() => null);
    }
    notificationsSent = true;
  } else if (newStatus === "delivered") {
    await createNotification({
      userId: buyerId,
      ...NotificationTemplates.delivered(orderIdStr),
    });
    if (order.deliveryAddress?.phone) {
      void sendSms({
        phone: order.deliveryAddress.phone,
        message: SMS_TEMPLATES.delivered(orderIdStr),
      }).catch(() => null);
    }
    if (buyer?.email) {
      void sendDeliveredEmail({
        to: buyer.email,
        buyerName: buyer.name ?? "Customer",
        orderId: orderIdStr,
      }).catch(() => null);
    }
    notificationsSent = true;
  }

  return { statusChanged, eventCreated, notificationsSent };
}

/**
 * Convenience wrapper: takes a full TrackingResult from a provider's
 * trackShipment() call and applies the most recent event to the shipment.
 */
export async function applyTrackingResult(
  shipment: ShipmentLike,
  result: TrackingResult,
  source: "webhook" | "cron" | "manual",
): Promise<ProcessUpdateResult> {
  // Use the latest event for description/location, or fall back to current status
  const latest = result.events[result.events.length - 1];

  return processTrackingUpdate({
    shipment,
    newStatus: result.currentStatus,
    description: latest?.description ?? result.currentStatus.replace(/_/g, " "),
    location: latest?.location,
    timestamp: latest?.timestamp ?? new Date(),
    source,
    rawPayload: result,
    carrierName: result.carrier,
    estimatedDeliveryDate: result.estimatedDeliveryDate,
  });
}
