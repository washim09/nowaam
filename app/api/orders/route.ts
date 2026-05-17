import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/auth";
import { LOCATIONS } from "@/lib/constants";
import { connectToDatabase } from "@/lib/db";
import { calculateUnitPrice } from "@/lib/pricing";
import { getPublicRazorpayKey, getRazorpayInstance } from "@/lib/razorpay";
import Coupon from "@/models/Coupon";
import Order from "@/models/Order";
import Product from "@/models/Product";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    const { searchParams } = request.nextUrl;
    const buyerParam = searchParams.get("buyer");
    const sellerParam = searchParams.get("sellerId");

    await connectToDatabase();

    const filter: Record<string, unknown> = {};

    if (buyerParam === "me") {
      if (!session?.user?.id) {
        return NextResponse.json({ error: "Authentication required." }, { status: 401 });
      }
      filter.buyerId = session.user.id;
    } else if (sellerParam) {
      if (!session?.user?.id) {
        return NextResponse.json({ error: "Authentication required." }, { status: 401 });
      }
      if (session.user.id !== sellerParam && session.user.role !== "admin") {
        return NextResponse.json({ error: "Forbidden." }, { status: 403 });
      }
      filter["items.sellerId"] = sellerParam;
    } else {
      if (session?.user?.role === "admin") {
        // admin with no params gets all orders — intentional
      } else {
        return NextResponse.json({ error: "Missing query parameter." }, { status: 400 });
      }
    }

    const orders = await Order.find(filter).sort({ createdAt: -1 }).limit(500).lean();

    return NextResponse.json({ orders: JSON.parse(JSON.stringify(orders)) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to fetch orders." },
      { status: 500 },
    );
  }
}

type DeliveryAddress = {
  fullName: string;
  phone: string;
  addressLine: string;
  area?: string;
  city: string;
  pincode?: string;
};

type OrderRequestPayload = {
  items?: Array<{
    productId: string;
    quantity: number;
  }>;
  userLocation?: string;
  deliveryAddress?: DeliveryAddress;
  couponCode?: string;
};

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const body = (await request.json()) as OrderRequestPayload;

    if (!body.items?.length) {
      return NextResponse.json({ error: "At least one item is required." }, { status: 400 });
    }

    if (!body.userLocation || !LOCATIONS.includes(body.userLocation as (typeof LOCATIONS)[number])) {
      return NextResponse.json({ error: "Please select a valid location." }, { status: 400 });
    }

    const invalidItem = body.items.find(
      (item) =>
        !item.productId ||
        !mongoose.Types.ObjectId.isValid(item.productId) ||
        !Number.isFinite(item.quantity) ||
        item.quantity < 1,
    );

    if (invalidItem) {
      return NextResponse.json({ error: "One or more cart items are invalid." }, { status: 400 });
    }

    await connectToDatabase();

    const productIds = body.items.map((item) => item.productId);
    const products = await Product.find({ _id: { $in: productIds } }).lean();
    const productMap = new Map(products.map((product) => [String(product._id), product]));

    const missingProduct = productIds.find((productId) => !productMap.has(productId));

    if (missingProduct) {
      return NextResponse.json(
        { error: "Some products in the cart no longer exist." },
        { status: 404 },
      );
    }

    for (const item of body.items) {
      const product = productMap.get(item.productId);
      if (product && product.stock !== null && product.stock !== undefined) {
        if (product.stock < item.quantity) {
          return NextResponse.json(
            { error: `"${product.name}" only has ${product.stock} units left in stock.` },
            { status: 409 },
          );
        }
      }
    }

    const orderItems = body.items.map((item) => {
      const product = productMap.get(item.productId);

      if (!product) {
        throw new Error("Unable to match cart items to products.");
      }

      const unitPrice = calculateUnitPrice(product, item.quantity);
      const totalPrice = unitPrice * item.quantity;

      return {
        productId: item.productId,
        sellerId: product.sellerId ?? null,
        name: product.name,
        quantity: item.quantity,
        unitPrice,
        totalPrice,
        image: product.image,
        location: product.location,
      };
    });

    const itemsTotal = orderItems.reduce((sum, item) => sum + item.totalPrice, 0);
    const totalQuantity = orderItems.reduce((sum, item) => sum + item.quantity, 0);

    let discountAmount = 0;
    let appliedCouponCode: string | null = null;

    if (body.couponCode?.trim()) {
      const coupon = await Coupon.findOne({
        code: body.couponCode.trim().toUpperCase(),
        isActive: true,
      });

      if (
        coupon &&
        (!coupon.expiresAt || coupon.expiresAt > new Date()) &&
        (coupon.maxUses == null || coupon.usedCount < coupon.maxUses) &&
        itemsTotal >= coupon.minOrderValue
      ) {
        discountAmount =
          coupon.discountType === "percent"
            ? Math.min(itemsTotal * (coupon.discountValue / 100), itemsTotal)
            : Math.min(coupon.discountValue, itemsTotal);
        discountAmount = Math.round(discountAmount * 100) / 100;
        appliedCouponCode = coupon.code;
      }
    }

    const totalAmount = Math.max(0, itemsTotal - discountAmount);
    const publicKey = getPublicRazorpayKey();

    if (!publicKey) {
      throw new Error("Missing NEXT_PUBLIC_RAZORPAY_KEY_ID or RAZORPAY_KEY_ID.");
    }

    const razorpay = getRazorpayInstance();
    const razorpayOrder = await razorpay.orders.create({
      amount: Math.round(totalAmount * 100),
      currency: "INR",
      receipt: `nw-${Date.now()}`,
      notes: {
        userLocation: body.userLocation,
        itemCount: String(orderItems.length),
      },
    });

    const order = await Order.create({
      productId: orderItems[0]?.productId,
      quantity: totalQuantity,
      totalAmount,
      userLocation: body.userLocation,
      paymentStatus: "created",
      razorpayOrderId: razorpayOrder.id,
      buyerId: session?.user?.id ?? null,
      deliveryAddress: body.deliveryAddress ?? null,
      couponCode: appliedCouponCode,
      discountAmount,
      items: orderItems,
    });

    if (appliedCouponCode) {
      await Coupon.findOneAndUpdate(
        { code: appliedCouponCode },
        { $inc: { usedCount: 1 } },
      );
    }

    return NextResponse.json({
      success: true,
      internalOrderId: String(order._id),
      orderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      keyId: publicKey,
      discountAmount,
      itemsTotal,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to create order.",
      },
      { status: 500 },
    );
  }
}
