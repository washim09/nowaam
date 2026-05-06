import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";

import { connectToDatabase } from "@/lib/db";
import { createNotification, NotificationTemplates } from "@/lib/notifications";
import { sendOutForDeliveryEmail, sendDeliveredEmail } from "@/lib/shipping-emails";
import { sendSms, SMS_TEMPLATES } from "@/lib/sms";
import User from "@/models/User";
import Order from "@/models/Order";
import Shipment from "@/models/Shipment";
import TrackingEvent from "@/models/TrackingEvent";

export const runtime = "nodejs";

function mapEasyPostStatus(status: string): string {
  const map: Record<string, string> = {
    pre_transit: "shipment_created",
    in_transit: "in_transit",
    out_for_delivery: "out_for_delivery",
    delivered: "delivered",
    return_to_sender: "returned_to_origin",
    failure: "failed_delivery",
    unknown: "in_transit",
    error: "failed_delivery",
  };
  return map[status] ?? "in_transit";
}

function mapToFulfillment(shipmentStatus: string): string | null {
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

type EasyPostTrackerDetail = {
  object: string;
  message: string;
  description?: string;
  status: string;
  status_detail?: string;
  datetime: string;
  source: string;
  carrier_code?: string;
  tracking_location?: {
    object: string;
    city?: string;
    state?: string;
    country?: string;
    zip?: string;
  };
};

type EasyPostTracker = {
  id: string;
  object: string;
  tracking_code: string;
  status: string;
  carrier: string;
  est_delivery_date?: string;
  tracking_details: EasyPostTrackerDetail[];
};

type EasyPostWebhookPayload = {
  id: string;
  object: string;
  description: string;
  mode: string;
  result: EasyPostTracker;
  created_at: string;
  updated_at: string;
};

function verifyWebhookSignature(body: string, signature: string, secret: string): boolean {
  const expected = crypto
    .createHmac("sha256", secret)
    .update(body)
    .digest("hex");
  const expectedHeader = `hmac-sha256-hex=${expected}`;
  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedHeader));
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("x-hmac-signature-256") ?? "";
    const secret = process.env.EASYPOST_WEBHOOK_SECRET ?? "";

    if (secret && signature) {
      const isValid = verifyWebhookSignature(rawBody, signature, secret);
      if (!isValid) {
        return NextResponse.json({ error: "Invalid webhook signature." }, { status: 401 });
      }
    }

    const payload = JSON.parse(rawBody) as EasyPostWebhookPayload;

    if (!payload.result || payload.object !== "Event") {
      return NextResponse.json({ received: true });
    }

    const tracker = payload.result;
    if (!tracker.tracking_code) {
      return NextResponse.json({ received: true });
    }

    await connectToDatabase();

    const shipment = await Shipment.findOne({
      $or: [
        { awbNumber: tracker.tracking_code },
        { easypostTrackerId: tracker.id },
      ],
    });

    if (!shipment) {
      return NextResponse.json({ received: true });
    }

    const newStatus = mapEasyPostStatus(tracker.status);

    const latestDetail = tracker.tracking_details[tracker.tracking_details.length - 1];
    if (latestDetail) {
      const location = latestDetail.tracking_location
        ? [latestDetail.tracking_location.city, latestDetail.tracking_location.state]
            .filter(Boolean)
            .join(", ")
        : undefined;

      const alreadyExists = await TrackingEvent.findOne({
        shipmentId: shipment._id,
        status: newStatus,
        timestamp: new Date(latestDetail.datetime),
      });

      if (!alreadyExists) {
        await TrackingEvent.create({
          shipmentId: shipment._id,
          awbNumber: tracker.tracking_code,
          status: newStatus,
          description: latestDetail.message ?? latestDetail.status,
          location,
          timestamp: new Date(latestDetail.datetime),
          source: "webhook",
          rawPayload: latestDetail,
        });
      }
    }

    const shipmentUpdates: Record<string, unknown> = {
      shipmentStatus: newStatus,
    };
    if (tracker.est_delivery_date) {
      shipmentUpdates.estimatedDeliveryDate = new Date(tracker.est_delivery_date);
    }

    await Shipment.findByIdAndUpdate(shipment._id, {
      $set: shipmentUpdates,
      $push: {
        timeline: {
          status: newStatus,
          description: latestDetail?.message ?? newStatus.replace(/_/g, " "),
          timestamp: new Date(latestDetail?.datetime ?? Date.now()),
        },
      },
    });

    const fulfillmentStatus = mapToFulfillment(newStatus);
    if (fulfillmentStatus && shipment.orderId) {
      await Order.findByIdAndUpdate(shipment.orderId, {
        $set: { fulfillmentStatus },
        $push: {
          timeline: {
            status: fulfillmentStatus,
            description: `Courier update: ${newStatus.replace(/_/g, " ")}.`,
            timestamp: new Date(),
            actor: "system",
          },
        },
      });

      const order = await Order.findById(shipment.orderId).select("buyerId deliveryAddress").lean();
      if (order?.buyerId) {
        const awb = tracker.tracking_code;
        const orderId = String(shipment.orderId);
        const buyer = await User.findById(order.buyerId).select("name email").lean();

        if (newStatus === "out_for_delivery") {
          const notif = NotificationTemplates.outForDelivery(orderId, awb);
          await createNotification({ userId: order.buyerId, ...notif });
          if (order.deliveryAddress?.phone) {
            await sendSms({ phone: order.deliveryAddress.phone, message: SMS_TEMPLATES.outForDelivery(awb) });
          }
          if (buyer?.email) {
            void sendOutForDeliveryEmail({
              to: buyer.email,
              buyerName: buyer.name ?? "Customer",
              orderId,
              awb,
              carrier: shipment.carrier ?? "",
              trackingUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/track/${awb}`,
            });
          }
        } else if (newStatus === "delivered") {
          const notif = NotificationTemplates.delivered(orderId);
          await createNotification({ userId: order.buyerId, ...notif });
          if (order.deliveryAddress?.phone) {
            await sendSms({ phone: order.deliveryAddress.phone, message: SMS_TEMPLATES.delivered(orderId) });
          }
          if (buyer?.email) {
            void sendDeliveredEmail({
              to: buyer.email,
              buyerName: buyer.name ?? "Customer",
              orderId,
            });
          }
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[EasyPost Webhook]", error);
    return NextResponse.json({ received: true });
  }
}
