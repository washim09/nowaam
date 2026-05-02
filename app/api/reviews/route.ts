import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";

import { connectToDatabase } from "@/lib/db";
import Order from "@/models/Order";
import Review from "@/models/Review";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const productId = searchParams.get("productId");
    const orderIdsParam = searchParams.get("orderIds");

    if (!productId && !orderIdsParam) {
      return NextResponse.json(
        { error: "Provide productId or orderIds query parameter." },
        { status: 400 },
      );
    }

    await connectToDatabase();

    let query: Record<string, unknown> = {};

    if (productId) {
      if (!mongoose.Types.ObjectId.isValid(productId)) {
        return NextResponse.json({ error: "Invalid product ID." }, { status: 400 });
      }
      query = { productId: new mongoose.Types.ObjectId(productId) };
    } else if (orderIdsParam) {
      const orderIds = orderIdsParam
        .split(",")
        .filter((id) => mongoose.Types.ObjectId.isValid(id))
        .map((id) => new mongoose.Types.ObjectId(id));

      if (orderIds.length === 0) {
        return NextResponse.json({ reviews: [] });
      }
      query = { orderId: { $in: orderIds } };
    }

    const reviews = await Review.find(query).sort({ createdAt: -1 }).lean();

    return NextResponse.json({ reviews: JSON.parse(JSON.stringify(reviews)) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to fetch reviews." },
      { status: 500 },
    );
  }
}

type ReviewPayload = {
  productId?: string;
  orderId?: string;
  rating?: number;
  comment?: string;
  buyerName?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ReviewPayload;

    if (
      !body.productId ||
      !body.orderId ||
      !body.rating ||
      !body.comment?.trim() ||
      !body.buyerName?.trim()
    ) {
      return NextResponse.json(
        { error: "productId, orderId, rating, comment, and buyerName are required." },
        { status: 400 },
      );
    }

    if (
      !mongoose.Types.ObjectId.isValid(body.productId) ||
      !mongoose.Types.ObjectId.isValid(body.orderId)
    ) {
      return NextResponse.json({ error: "Invalid productId or orderId." }, { status: 400 });
    }

    const rating = Number(body.rating);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return NextResponse.json({ error: "Rating must be an integer between 1 and 5." }, { status: 400 });
    }

    await connectToDatabase();

    const order = await Order.findById(body.orderId).lean();
    if (!order || order.paymentStatus !== "paid") {
      return NextResponse.json(
        { error: "Order not found or payment not completed." },
        { status: 400 },
      );
    }

    const hasProduct = order.items.some(
      (item) => item.productId.toString() === body.productId,
    );
    if (!hasProduct) {
      return NextResponse.json(
        { error: "This product was not part of the specified order." },
        { status: 400 },
      );
    }

    const review = await Review.create({
      productId: new mongoose.Types.ObjectId(body.productId),
      orderId: new mongoose.Types.ObjectId(body.orderId),
      rating,
      comment: body.comment.trim(),
      buyerName: body.buyerName.trim(),
    });

    return NextResponse.json(
      { review: JSON.parse(JSON.stringify(review)) },
      { status: 201 },
    );
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      Number((error as { code?: unknown }).code) === 11000
    ) {
      return NextResponse.json(
        { error: "You have already reviewed this product for that order." },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to submit review." },
      { status: 500 },
    );
  }
}
