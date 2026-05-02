import mongoose from "mongoose";
import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { connectToDatabase } from "@/lib/db";
import Order from "@/models/Order";

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

    return NextResponse.json({ order: JSON.parse(JSON.stringify(updated)) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to update order." },
      { status: 500 },
    );
  }
}
