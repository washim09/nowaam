import mongoose from "mongoose";

import { connectToDatabase } from "@/lib/db";
import { logger } from "@/lib/logger";
import { createNotification, NotificationTemplates } from "@/lib/notifications";
import {
  ShippingService,
  type CreateShipmentParams,
  type ProviderName,
} from "@/lib/shipping/ShippingService";
import Order from "@/models/Order";
import SellerShippingPreferences from "@/models/SellerShippingPreferences";
import Shipment from "@/models/Shipment";

export type AutoCreateResult = {
  orderId: string;
  created: number;
  skipped: number;
  failed: number;
  details: Array<{
    sellerId: string;
    status: "created" | "skipped" | "failed";
    reason?: string;
    shipmentId?: string;
  }>;
};

/**
 * Auto-create shipments after a successful payment.
 *
 * Groups order items by seller, respects each seller's preferences, and
 * creates a Shipment record per seller via their preferred provider.
 * Rate selection remains manual — seller picks courier in dashboard after.
 *
 * Errors are isolated per seller and never thrown. Called fire-and-forget
 * from the payment verify endpoint.
 */
export async function autoCreateShipmentsForOrder(
  orderId: string,
): Promise<AutoCreateResult> {
  const result: AutoCreateResult = {
    orderId,
    created: 0,
    skipped: 0,
    failed: 0,
    details: [],
  };

  try {
    if (!mongoose.Types.ObjectId.isValid(orderId)) return result;
    await connectToDatabase();

    const order = await Order.findById(orderId).lean();
    if (!order) return result;
    const isCodOrder = order.paymentMode === "cod" && order.paymentStatus === "created";
    if (!isCodOrder && order.paymentStatus !== "paid") return result;

    const delivery = order.deliveryAddress;
    if (!delivery?.fullName || !delivery?.addressLine || !delivery?.pincode) {
      return result;
    }

    const sellerIds = [
      ...new Set(
        (order.items ?? [])
          .map((i) => i.sellerId)
          .filter((id): id is string => typeof id === "string" && id.length > 0),
      ),
    ];
    if (sellerIds.length === 0) return result;

    await Promise.all(
      sellerIds.map(async (sellerId) => {
        try {
          const detail = await processOneSeller(sellerId, order);
          result.details.push(detail);
          if (detail.status === "created") result.created += 1;
          else if (detail.status === "skipped") result.skipped += 1;
          else result.failed += 1;
        } catch (err) {
          result.failed += 1;
          const reason = err instanceof Error ? err.message : "unknown";
          result.details.push({ sellerId, status: "failed", reason });
          await notifyFailure(sellerId, orderId, reason);
        }
      }),
    );

    return result;
  } catch (err) {
    logger.error("auto_shipment.fatal", {
      orderId,
      error: err instanceof Error ? err.message : String(err),
    });
    return result;
  }
  finally {
    logger.info("auto_shipment.completed", {
      orderId,
      created: result.created,
      skipped: result.skipped,
      failed: result.failed,
    });
  }
}

type DetailEntry = AutoCreateResult["details"][number];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function processOneSeller(sellerId: string, order: any): Promise<DetailEntry> {
  // Skip if a shipment already exists for this seller+order
  const existing = await Shipment.findOne({ orderId: order._id, sellerId });
  if (existing) {
    return {
      sellerId,
      status: "skipped",
      reason: "Shipment already exists.",
      shipmentId: String(existing._id),
    };
  }

  const prefs = await SellerShippingPreferences.findOne({ sellerId }).lean();
  if (!prefs) {
    await notifyFailure(
      sellerId,
      String(order._id),
      "Shipping preferences not configured.",
    );
    return {
      sellerId,
      status: "skipped",
      reason: "No shipping preferences configured.",
    };
  }

  if (!prefs.autoCreateOnPayment) {
    return { sellerId, status: "skipped", reason: "Auto-create disabled." };
  }

  const providerName = (prefs.preferredProvider ?? "shiprocket") as ProviderName;
  const registration = prefs.providerRegistrations?.find(
    (r) => r.provider === providerName,
  );
  if (!registration?.nickname) {
    await notifyFailure(
      sellerId,
      String(order._id),
      `Pickup address not registered with ${providerName}.`,
    );
    return {
      sellerId,
      status: "skipped",
      reason: "Pickup address not registered with provider.",
    };
  }

  // ─── Build shipment params ──────────────────────────────────────
  const delivery = order.deliveryAddress;
  const sellerItems = (order.items ?? []).filter(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (i: any) => i.sellerId === sellerId,
  );
  const totalQty = sellerItems.reduce(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (sum: number, i: any) => sum + (i.quantity ?? 1),
    0,
  );
  const sellerSubtotal = sellerItems.reduce(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (sum: number, i: any) => sum + (i.totalPrice ?? 0),
    0,
  );

  const defaults = prefs.packageDefaults ?? {};
  const baseWeight = defaults.weightGrams ?? 500;
  const totalWeight = baseWeight * Math.max(1, totalQty);

  const params: CreateShipmentParams = {
    fromAddress: {
      name: registration.nickname, // Shiprocket pickup_location nickname
      phone: prefs.pickupAddress.phone,
      street1: prefs.pickupAddress.addressLine1,
      street2: prefs.pickupAddress.addressLine2 ?? "",
      city: prefs.pickupAddress.city,
      state: prefs.pickupAddress.state,
      zip: prefs.pickupAddress.pincode,
      country: "IN",
    },
    toAddress: {
      name: delivery.fullName,
      phone: delivery.phone ?? "",
      street1: delivery.addressLine,
      street2: delivery.area ?? "",
      city: delivery.city,
      state: delivery.state ?? delivery.city,
      zip: delivery.pincode ?? "000000",
      country: "IN",
    },
    parcel: {
      weight: totalWeight,
      length: defaults.lengthCm ?? 15,
      width: defaults.widthCm ?? 10,
      height: defaults.heightCm ?? 5,
    },
    referenceId: String(order._id),
    paymentMode: order.paymentMode === "cod" ? "cod" : "prepaid",
    codAmount: order.paymentMode === "cod" ? sellerSubtotal : 0,
  };

  // ─── Call provider ──────────────────────────────────────────────
  const provider = ShippingService.getProvider(providerName);
  const created = await provider.createShipment(params);

  // Shiprocket returns "shipmentId:orderId"; split for storage
  const [providerShipId, providerOrdId] = created.providerShipmentId.split(":");

  const shipment = await Shipment.create({
    orderId: order._id,
    sellerId,
    providerName,
    providerShipmentId: providerShipId ?? created.providerShipmentId,
    providerOrderId: providerOrdId || undefined,
    pickupAddress: {
      fullName: prefs.pickupAddress.contactPerson,
      phone: prefs.pickupAddress.phone,
      addressLine: prefs.pickupAddress.addressLine1,
      area: prefs.pickupAddress.addressLine2,
      city: prefs.pickupAddress.city,
      state: prefs.pickupAddress.state,
      pincode: prefs.pickupAddress.pincode,
      country: "India",
    },
    deliveryAddress: delivery,
    packageWeight: totalWeight,
    packageDimensions: {
      length: params.parcel.length,
      width: params.parcel.width,
      height: params.parcel.height,
      unit: "cm",
    },
    paymentMode: params.paymentMode,
    codAmount: params.codAmount,
    shipmentStatus: "shipment_created",
    carrier: created.lowestRate?.carrier,
    service: created.lowestRate?.service,
    shippingCost: created.lowestRate?.rate ?? 0,
    timeline: [
      {
        status: "shipment_created",
        description: `Auto-created on payment via ${providerName}.`,
        timestamp: new Date(),
      },
    ],
  });

  await Order.findByIdAndUpdate(order._id, {
    $addToSet: { shipmentIds: String(shipment._id) },
    $set: { fulfillmentStatus: "processing" },
    $push: {
      timeline: {
        status: "processing",
        description: `Shipment auto-created for seller ${sellerId.slice(-6)}.`,
        timestamp: new Date(),
        actor: "system",
      },
    },
  });

  await createNotification({
    userId: sellerId,
    ...NotificationTemplates.shipmentAutoCreated(String(order._id), providerName),
  });

  return { sellerId, status: "created", shipmentId: String(shipment._id) };
}

async function notifyFailure(sellerId: string, orderId: string, reason: string) {
  logger.warn("auto_shipment.seller_failure", { sellerId, orderId, reason });
  try {
    await createNotification({
      userId: sellerId,
      ...NotificationTemplates.shipmentAutoCreateFailed(orderId, reason),
    });
  } catch (err) {
    logger.error("auto_shipment.notify_error", {
      sellerId,
      orderId,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
