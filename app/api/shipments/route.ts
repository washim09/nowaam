import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/auth";
import { connectToDatabase } from "@/lib/db";
import { createNotification, NotificationTemplates } from "@/lib/notifications";
import { sendShipmentCreatedEmail } from "@/lib/shipping-emails";
import { sendSms, SMS_TEMPLATES } from "@/lib/sms";
import { ShippingService } from "@/lib/shipping/ShippingService";
import type { CreateShipmentParams } from "@/lib/shipping/interfaces/ShippingProvider";
import Order from "@/models/Order";
import Shipment from "@/models/Shipment";
import TrackingEvent from "@/models/TrackingEvent";
import User from "@/models/User";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    await connectToDatabase();

    const { searchParams } = request.nextUrl;
    const sellerId = searchParams.get("sellerId");
    const orderId = searchParams.get("orderId");
    const status = searchParams.get("status");

    const filter: Record<string, unknown> = {};

    if (session.user.role === "seller") {
      filter.sellerId = session.user.id;
    } else if (session.user.role === "admin") {
      if (sellerId) filter.sellerId = sellerId;
    }

    if (orderId) filter.orderId = orderId;
    if (status) filter.shipmentStatus = status;

    const shipments = await Shipment.find(filter).sort({ createdAt: -1 }).limit(200).lean();

    return NextResponse.json({ shipments: JSON.parse(JSON.stringify(shipments)) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to fetch shipments." },
      { status: 500 },
    );
  }
}

type CreateShipmentBody = {
  orderId: string;
  pickupAddress: {
    fullName: string;
    phone?: string;
    addressLine: string;
    area?: string;
    city: string;
    state: string;
    pincode: string;
  };
  packageWeight: number;
  packageDimensions?: { length: number; width: number; height: number };
  paymentMode?: "prepaid" | "cod";
  autoSelectLowestRate?: boolean;
};

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }
    if (!["seller", "admin"].includes(session.user.role ?? "")) {
      return NextResponse.json({ error: "Seller access required." }, { status: 403 });
    }

    const body = (await request.json()) as CreateShipmentBody;

    if (!body.orderId || !mongoose.Types.ObjectId.isValid(body.orderId)) {
      return NextResponse.json({ error: "Valid orderId is required." }, { status: 400 });
    }
    if (!body.pickupAddress?.city || !body.pickupAddress?.addressLine) {
      return NextResponse.json({ error: "Pickup address is required." }, { status: 400 });
    }
    if (!body.packageWeight || body.packageWeight < 1) {
      return NextResponse.json({ error: "Package weight (grams) is required." }, { status: 400 });
    }

    await connectToDatabase();

    const order = await Order.findById(body.orderId).lean();
    if (!order) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }

    const delivery = order.deliveryAddress;
    if (!delivery?.fullName || !delivery?.addressLine || !delivery?.city) {
      return NextResponse.json(
        { error: "Order delivery address is incomplete." },
        { status: 400 },
      );
    }

    const provider = ShippingService.getProvider();

    const params: CreateShipmentParams = {
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
      fromAddress: {
        name: body.pickupAddress.fullName,
        phone: body.pickupAddress.phone ?? "",
        street1: body.pickupAddress.addressLine,
        street2: body.pickupAddress.area ?? "",
        city: body.pickupAddress.city,
        state: body.pickupAddress.state,
        zip: body.pickupAddress.pincode,
        country: "IN",
      },
      parcel: {
        weight: body.packageWeight,
        length: body.packageDimensions?.length,
        width: body.packageDimensions?.width,
        height: body.packageDimensions?.height,
      },
      referenceId: body.orderId,
      paymentMode: body.paymentMode ?? "prepaid",
      codAmount: body.paymentMode === "cod" ? order.totalAmount : 0,
    };

    const result = await provider.createShipment(params);

    let labelResult = null;
    if (body.autoSelectLowestRate) {
      labelResult = await provider.buyLabel(
        result.providerShipmentId,
        result.lowestRate.rateId,
      );
    }

    const shipment = await Shipment.create({
      orderId: body.orderId,
      sellerId: session.user.id,
      easypostShipmentId: result.providerShipmentId,
      pickupAddress: body.pickupAddress,
      deliveryAddress: delivery,
      packageWeight: body.packageWeight,
      packageDimensions: body.packageDimensions,
      paymentMode: body.paymentMode ?? "prepaid",
      codAmount: body.paymentMode === "cod" ? order.totalAmount : 0,
      shipmentStatus: labelResult ? "awb_assigned" : "shipment_created",
      awbNumber: labelResult?.awbNumber,
      trackingUrl: labelResult?.trackingUrl,
      shippingLabel: labelResult?.labelUrl,
      carrier: labelResult?.carrier ?? result.lowestRate.carrier,
      service: labelResult?.service ?? result.lowestRate.service,
      shippingCost: labelResult?.shippingCost ?? result.lowestRate.rate,
      rateId: result.lowestRate.rateId,
      easypostTrackerId: labelResult?.trackerId,
      estimatedDeliveryDate: labelResult?.estimatedDeliveryDate,
      timeline: [
        {
          status: "shipment_created",
          description: "Shipment created by seller.",
          timestamp: new Date(),
        },
      ],
    });

    await Order.findByIdAndUpdate(body.orderId, {
      $addToSet: { shipmentIds: String(shipment._id) },
      $set: { fulfillmentStatus: "processing" },
      $push: {
        timeline: {
          status: "processing",
          description: "Shipment created.",
          timestamp: new Date(),
          actor: session.user.name ?? session.user.id,
        },
      },
    });

    if (labelResult?.awbNumber) {
      await TrackingEvent.create({
        shipmentId: shipment._id,
        awbNumber: labelResult.awbNumber,
        status: "awb_assigned",
        description: `AWB ${labelResult.awbNumber} assigned via ${labelResult.carrier}.`,
        source: "manual",
        timestamp: new Date(),
      });
    }

    if (order.buyerId) {
      const notif = NotificationTemplates.shipmentCreated(
        body.orderId,
        labelResult?.awbNumber ?? String(shipment._id),
        labelResult?.carrier ?? result.lowestRate.carrier,
      );
      await createNotification({ userId: order.buyerId, ...notif });

      const buyer = await User.findById(order.buyerId).select("name email").lean();
      const buyerPhone = delivery.phone;
      if (buyerPhone && labelResult?.awbNumber) {
        await sendSms({
          phone: buyerPhone,
          message: SMS_TEMPLATES.shipmentCreated(labelResult.awbNumber, labelResult.carrier),
        });
      }
      if (buyer?.email && labelResult?.awbNumber) {
        const trackingUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/track/${labelResult.awbNumber}`;
        void sendShipmentCreatedEmail({
          to: buyer.email,
          buyerName: buyer.name ?? "Customer",
          orderId: body.orderId,
          awb: labelResult.awbNumber,
          carrier: labelResult.carrier,
          estimatedDelivery: labelResult.estimatedDeliveryDate?.toISOString(),
          trackingUrl,
        });
      }
    }

    return NextResponse.json(
      {
        success: true,
        shipment: JSON.parse(JSON.stringify(shipment)),
        rates: result.rates,
        lowestRate: result.lowestRate,
        labelGenerated: !!labelResult,
      },
      { status: 201 },
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to create shipment." },
      { status: 500 },
    );
  }
}
