import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/auth";
import { connectToDatabase } from "@/lib/db";
import { createNotification, NotificationTemplates } from "@/lib/notifications";
import { sendSms, SMS_TEMPLATES } from "@/lib/sms";
import Order from "@/models/Order";
import Return from "@/models/Return";

export const runtime = "nodejs";

const VALID_REASONS = [
  "damaged",
  "wrong_item",
  "not_as_described",
  "quality_issue",
  "changed_mind",
  "duplicate_order",
  "other",
] as const;

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    await connectToDatabase();

    const { searchParams } = request.nextUrl;
    const filter: Record<string, unknown> = {};

    if (session.user.role === "buyer" || !session.user.role) {
      filter.buyerId = session.user.id;
    } else if (session.user.role === "seller") {
      filter.sellerId = session.user.id;
    }

    const status = searchParams.get("status");
    if (status) filter.returnStatus = status;

    const returns = await Return.find(filter).sort({ createdAt: -1 }).limit(100).lean();

    return NextResponse.json({ returns: JSON.parse(JSON.stringify(returns)) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to fetch returns." },
      { status: 500 },
    );
  }
}

type CreateReturnBody = {
  orderId: string;
  shipmentId?: string;
  reason: string;
  description?: string;
  images?: string[];
};

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const body = (await request.json()) as CreateReturnBody;

    if (!body.orderId || !mongoose.Types.ObjectId.isValid(body.orderId)) {
      return NextResponse.json({ error: "Valid orderId is required." }, { status: 400 });
    }
    if (!body.reason || !VALID_REASONS.includes(body.reason as (typeof VALID_REASONS)[number])) {
      return NextResponse.json({ error: "Valid return reason is required." }, { status: 400 });
    }

    await connectToDatabase();

    const order = await Order.findById(body.orderId).lean();
    if (!order) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }

    const existingReturn = await Return.findOne({ orderId: body.orderId, returnStatus: { $ne: "closed" } });
    if (existingReturn) {
      return NextResponse.json({ error: "A return request is already active for this order." }, { status: 409 });
    }

    const sellerId = order.items?.[0]?.sellerId ?? undefined;

    const returnRequest = await Return.create({
      orderId: body.orderId,
      shipmentId: body.shipmentId ?? undefined,
      buyerId: session.user.id,
      sellerId,
      reason: body.reason,
      description: body.description,
      images: body.images ?? [],
      returnStatus: "requested",
      timeline: [
        {
          status: "requested",
          description: `Return requested by buyer. Reason: ${body.reason.replace(/_/g, " ")}.`,
          timestamp: new Date(),
          actor: session.user.id,
        },
      ],
    });

    await Order.findByIdAndUpdate(body.orderId, {
      $set: { fulfillmentStatus: "return_requested" },
      $push: {
        timeline: {
          status: "return_requested",
          description: "Buyer initiated return request.",
          timestamp: new Date(),
          actor: session.user.id,
        },
      },
    });

    if (sellerId) {
      await createNotification({
        userId: sellerId,
        type: "return_requested",
        title: "Return Requested",
        message: `Buyer requested return for order ${body.orderId.slice(-8)}. Reason: ${body.reason.replace(/_/g, " ")}.`,
        metadata: { orderId: body.orderId, returnId: String(returnRequest._id) },
      });
    }

    const buyerPhone = order.deliveryAddress?.phone;
    if (buyerPhone) {
      await sendSms({
        phone: buyerPhone,
        message: `Your return request for Nowaam order ${body.orderId.slice(-8)} has been submitted. We'll review it within 24 hours.`,
      });
    }

    return NextResponse.json(
      { success: true, return: JSON.parse(JSON.stringify(returnRequest)) },
      { status: 201 },
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to create return request." },
      { status: 500 },
    );
  }
}
