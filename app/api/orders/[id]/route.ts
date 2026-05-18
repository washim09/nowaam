import mongoose from "mongoose";
import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { connectToDatabase } from "@/lib/db";
import { createNotification, NotificationTemplates } from "@/lib/notifications";
import { sendShipmentCreatedEmail, sendDeliveredEmail } from "@/lib/shipping-emails";
import { sendSms, SMS_TEMPLATES } from "@/lib/sms";
import Order from "@/models/Order";
import Shipment from "@/models/Shipment";
import User from "@/models/User";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid order ID." }, { status: 400 });
    }

    await connectToDatabase();

    const order = await Order.findById(id).lean();

    if (!order) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }

    return NextResponse.json({ order: JSON.parse(JSON.stringify(order)) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to fetch order." },
      { status: 500 },
    );
  }
}

const ALLOWED_FULFILLMENT_STATUSES = [
  "pending",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
  "refund_requested",
] as const;

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid order ID." }, { status: 400 });
    }

    const body = (await request.json()) as { fulfillmentStatus?: string };

    if (
      !body.fulfillmentStatus ||
      !(ALLOWED_FULFILLMENT_STATUSES as readonly string[]).includes(body.fulfillmentStatus)
    ) {
      return NextResponse.json(
        { error: `fulfillmentStatus must be one of: ${ALLOWED_FULFILLMENT_STATUSES.join(", ")}.` },
        { status: 400 },
      );
    }

    await connectToDatabase();

    const existing = await Order.findById(id).lean();
    if (!existing) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }

    const isAdmin = session.user.role === "admin";
    const isSeller =
      session.user.role === "seller" &&
      existing.items?.some((item) => String(item.sellerId) === session.user.id);

    if (!isAdmin && !isSeller) {
      return NextResponse.json({ error: "Access denied." }, { status: 403 });
    }

    const updated = await Order.findByIdAndUpdate(
      id,
      { $set: { fulfillmentStatus: body.fulfillmentStatus } },
      { new: true },
    ).lean();

    if (!updated) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }

    const orderIdStr = String(id);
    const buyerIdStr = existing.buyerId ? String(existing.buyerId) : null;
    const buyerPhone = existing.deliveryAddress?.phone;

    if (body.fulfillmentStatus === "packed" && buyerIdStr) {
      void createNotification({
        userId: buyerIdStr,
        ...NotificationTemplates.orderPacked(orderIdStr),
      });
    }

    if (body.fulfillmentStatus === "shipped") {
      const sellerId = session.user.id;
      const existingShipment = await Shipment.findOne({ orderId: id, sellerId });

      if (!existingShipment) {
        const addr = existing.deliveryAddress;
        await Shipment.create({
          orderId: id,
          sellerId,
          shipmentStatus: "in_transit",
          deliveryAddress: addr
            ? {
                fullName: addr.fullName,
                phone: addr.phone,
                addressLine: addr.addressLine,
                area: addr.area,
                city: addr.city,
                state: addr.state,
                pincode: addr.pincode,
              }
            : undefined,
          timeline: [{
            status: "in_transit",
            description: "Order marked as shipped by seller",
            timestamp: new Date(),
          }],
        });
      } else if (["shipment_created", "awb_assigned", "pickup_scheduled", "picked_up"].includes(existingShipment.shipmentStatus)) {
        await Shipment.findByIdAndUpdate(existingShipment._id, {
          $set: { shipmentStatus: "in_transit" },
          $push: { timeline: { status: "in_transit", description: "Order marked as shipped by seller", timestamp: new Date() } },
        });
      }

      if (buyerIdStr) {
        void createNotification({
          userId: buyerIdStr,
          ...NotificationTemplates.shipmentCreated(orderIdStr, "—", "Seller"),
        });
        const buyer = await User.findById(buyerIdStr).select("email name").lean();
        if (buyer?.email) {
          void sendShipmentCreatedEmail({
            to: buyer.email,
            buyerName: buyer.name || existing.deliveryAddress?.fullName || "Customer",
            orderId: orderIdStr,
            awb: "—",
            carrier: "Seller Dispatch",
            trackingUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/account`,
          }).catch(() => null);
        }
        if (buyerPhone) {
          void sendSms({
            phone: buyerPhone,
            message: SMS_TEMPLATES.shipmentCreated(orderIdStr.slice(-8), "Seller Dispatch"),
          }).catch(() => null);
        }
      }
    }

    if (body.fulfillmentStatus === "delivered") {
      await Shipment.findOneAndUpdate(
        { orderId: id },
        {
          $set: { shipmentStatus: "delivered" },
          $push: { timeline: { status: "delivered", description: "Order delivered to buyer", timestamp: new Date() } },
        },
      );

      if (buyerIdStr) {
        void createNotification({
          userId: buyerIdStr,
          ...NotificationTemplates.delivered(orderIdStr),
        });
        const buyer = await User.findById(buyerIdStr).select("email name").lean();
        if (buyer?.email) {
          void sendDeliveredEmail({
            to: buyer.email,
            buyerName: buyer.name || existing.deliveryAddress?.fullName || "Customer",
            orderId: orderIdStr,
          }).catch(() => null);
        }
        if (buyerPhone) {
          void sendSms({
            phone: buyerPhone,
            message: SMS_TEMPLATES.delivered(orderIdStr),
          }).catch(() => null);
        }
      }
    }

    return NextResponse.json({ order: JSON.parse(JSON.stringify(updated)) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to update order." },
      { status: 500 },
    );
  }
}
