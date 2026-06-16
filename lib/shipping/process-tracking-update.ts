import { Types } from "mongoose";

import type { TrackingResult } from "@/lib/shipping/interfaces/ShippingProvider";
import { dispatchMultiChannel } from "@/lib/multi-channel-notify";
import { createNotification, NotificationTemplates } from "@/lib/notifications";
import { sendOutForDeliveryEmail, sendDeliveredEmail } from "@/lib/shipping-emails";
import { sendSms, SMS_TEMPLATES } from "@/lib/sms";
import { WhatsAppTemplates } from "@/lib/whatsapp/templates";
import NDR from "@/models/NDR";
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

  // NDR detection — fires when courier reports a failed delivery attempt
  if (newStatus === "failed_delivery") {
    void handleNdrEvent({
      shipment,
      description,
      location,
      timestamp,
    }).catch(() => null);
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

  const buyerName = buyer?.name ?? "Customer";
  const phone = order.deliveryAddress?.phone;
  const trackingUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/track/${awb}`;

  if (newStatus === "out_for_delivery") {
    await dispatchMultiChannel({
      userId: buyerId,
      category: "shipment_updates",
      inApp: {
        ...NotificationTemplates.outForDelivery(orderIdStr, awb),
      },
      email: buyer?.email
        ? {
            to: buyer.email,
            send: () =>
              sendOutForDeliveryEmail({
                to: buyer.email!,
                buyerName,
                orderId: orderIdStr,
                awb,
                carrier: carrierName ?? shipment.carrier ?? "",
                trackingUrl,
              }),
          }
        : undefined,
      sms: phone
        ? {
            phone,
            send: () => sendSms({ phone, message: SMS_TEMPLATES.outForDelivery(awb) }),
          }
        : undefined,
      whatsapp: phone
        ? {
            phone,
            template: WhatsAppTemplates.outForDelivery(buyerName, orderIdStr.slice(-8), awb),
          }
        : undefined,
    });
    notificationsSent = true;
  } else if (newStatus === "delivered") {
    await dispatchMultiChannel({
      userId: buyerId,
      category: "shipment_updates",
      inApp: {
        ...NotificationTemplates.delivered(orderIdStr),
      },
      email: buyer?.email
        ? {
            to: buyer.email,
            send: () =>
              sendDeliveredEmail({
                to: buyer.email!,
                buyerName,
                orderId: orderIdStr,
              }),
          }
        : undefined,
      sms: phone
        ? {
            phone,
            send: () => sendSms({ phone, message: SMS_TEMPLATES.delivered(orderIdStr) }),
          }
        : undefined,
      whatsapp: phone
        ? {
            phone,
            template: WhatsAppTemplates.delivered(buyerName, orderIdStr.slice(-8)),
          }
        : undefined,
    });
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

/**
 * Create or update an NDR (Non-Delivery Report) record when a courier reports
 * a failed delivery attempt. Idempotent — incrementing attemptCount on repeats.
 */
async function handleNdrEvent(input: {
  shipment: ShipmentLike;
  description: string;
  location?: string;
  timestamp: Date;
}): Promise<void> {
  const { shipment, description, location, timestamp } = input;
  if (!shipment.orderId || !shipment.sellerId || !shipment.awbNumber) return;

  const existing = await NDR.findOne({ shipmentId: shipment._id });

  if (existing) {
    // Increment attempt count + push to timeline
    await NDR.findByIdAndUpdate(existing._id, {
      $inc: { attemptCount: 1 },
      $set: {
        lastAttemptDate: timestamp,
        reason: description,
        location,
        // If the seller already took action, mark as pending again for the next attempt
        ndrStatus: existing.ndrStatus === "resolved" ? "resolved" : "pending",
      },
      $push: {
        timeline: {
          action: "courier_attempt",
          description: `Attempt #${(existing.attemptCount ?? 1) + 1}: ${description}`,
          timestamp,
          actor: "courier",
        },
      },
    });
  } else {
    await NDR.create({
      shipmentId: shipment._id,
      orderId: shipment.orderId,
      sellerId: shipment.sellerId,
      awbNumber: shipment.awbNumber,
      providerName: shipment.providerName ?? "shiprocket",
      attemptCount: 1,
      lastAttemptDate: timestamp,
      reason: description,
      location,
      ndrStatus: "pending",
      sellerAction: "none",
      timeline: [
        {
          action: "ndr_created",
          description: `First failed attempt: ${description}`,
          timestamp,
          actor: "courier",
        },
      ],
    });
  }

  // Notify seller
  try {
    await createNotification({
      userId: String(shipment.sellerId),
      ...NotificationTemplates.ndrCreated(
        String(shipment.orderId),
        shipment.awbNumber,
        description,
      ),
    });
  } catch {
    // never crash the tracking pipeline because of a notification error
  }
}
