import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { LOCATIONS } from "@/lib/constants";
import { connectToDatabase } from "@/lib/db";
import { createNotification, NotificationTemplates } from "@/lib/notifications";
import { calculateUnitPrice } from "@/lib/pricing";
import { autoCreateShipmentsForOrder } from "@/lib/shipping/auto-create-shipments";
import Coupon from "@/models/Coupon";
import Order from "@/models/Order";
import Product from "@/models/Product";
import SellerShippingPreferences from "@/models/SellerShippingPreferences";

export const runtime = "nodejs";

type CodOrderPayload = {
  items?: Array<{ productId: string; quantity: number }>;
  userLocation?: string;
  deliveryAddress?: { fullName: string; phone: string; addressLine: string; area?: string; city: string; pincode?: string };
  couponCode?: string;
};

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Auth required." }, { status: 401 });
    const body = (await request.json()) as CodOrderPayload;
    if (!body.items?.length) return NextResponse.json({ error: "Cart empty." }, { status: 400 });
    if (!body.userLocation || !LOCATIONS.includes(body.userLocation as (typeof LOCATIONS)[number]))
      return NextResponse.json({ error: "Invalid location." }, { status: 400 });
    if (!body.deliveryAddress?.fullName?.trim() || !body.deliveryAddress?.phone?.trim() || !body.deliveryAddress?.addressLine?.trim())
      return NextResponse.json({ error: "Address incomplete." }, { status: 400 });
    const invalid = body.items.find((i) => !i.productId || !mongoose.Types.ObjectId.isValid(i.productId) || i.quantity < 1);
    if (invalid) return NextResponse.json({ error: "Invalid item." }, { status: 400 });

    await connectToDatabase();
    const products = await Product.find({ _id: { $in: body.items.map((i) => i.productId) } }).lean();
    const pMap = new Map(products.map((p) => [String(p._id), p]));
    if (body.items.some((i) => !pMap.has(i.productId)))
      return NextResponse.json({ error: "Product not found." }, { status: 404 });
    for (const item of body.items) {
      const p = pMap.get(item.productId);
      if (p && p.stock != null && p.stock < item.quantity)
        return NextResponse.json({ error: `${p.name} out of stock.` }, { status: 409 });
    }

    // COD eligibility
    const sellerIds = [...new Set(products.map((p) => p.sellerId).filter(Boolean))] as string[];
    if (sellerIds.length) {
      const prefs = await SellerShippingPreferences.find({ sellerId: { $in: sellerIds } }).select("sellerId codEnabled").lean();
      const codMap = new Map(prefs.map((p) => [p.sellerId, p.codEnabled]));
      if (sellerIds.some((id) => !codMap.get(id)))
        return NextResponse.json({ error: "COD not available for some items." }, { status: 400 });
    }

    // Build order
    const orderItems = body.items.map((item) => {
      const p = pMap.get(item.productId)!;
      const unitPrice = calculateUnitPrice(p, item.quantity);
      return { productId: item.productId, sellerId: p.sellerId ?? null, name: p.name, quantity: item.quantity, unitPrice, totalPrice: unitPrice * item.quantity, image: p.image, location: p.location };
    });
    const itemsTotal = orderItems.reduce((s, i) => s + i.totalPrice, 0);
    const totalQty = orderItems.reduce((s, i) => s + i.quantity, 0);

    let discountAmount = 0;
    let couponCode: string | null = null;
    if (body.couponCode?.trim()) {
      const c = await Coupon.findOne({ code: body.couponCode.trim().toUpperCase(), isActive: true });
      if (c && (!c.expiresAt || c.expiresAt > new Date()) && (c.maxUses == null || c.usedCount < c.maxUses) && itemsTotal >= c.minOrderValue) {
        discountAmount = c.discountType === "percent" ? Math.min(itemsTotal * (c.discountValue / 100), itemsTotal) : Math.min(c.discountValue, itemsTotal);
        discountAmount = Math.round(discountAmount * 100) / 100;
        couponCode = c.code;
      }
    }
    const totalAmount = Math.max(0, itemsTotal - discountAmount);

    const order = await Order.create({
      productId: orderItems[0]?.productId, quantity: totalQty, totalAmount,
      userLocation: body.userLocation, paymentStatus: "created", paymentMode: "cod",
      codAmount: totalAmount, fulfillmentStatus: "confirmed", buyerId: session.user.id,
      deliveryAddress: body.deliveryAddress, couponCode, discountAmount, items: orderItems,
      timeline: [
        { status: "placed", description: "Order placed (COD).", timestamp: new Date(), actor: "buyer" },
        { status: "confirmed", description: "COD confirmed. Pay on delivery.", timestamp: new Date(), actor: "system" },
      ],
    });

    if (couponCode) await Coupon.findOneAndUpdate({ code: couponCode }, { $inc: { usedCount: 1 } });
    for (const item of body.items) await Product.findByIdAndUpdate(item.productId, { $inc: { stock: -item.quantity } });
    void createNotification({ userId: session.user.id, ...NotificationTemplates.orderPlaced(String(order._id)) }).catch(() => null);
    void autoCreateShipmentsForOrder(String(order._id)).catch(() => null);

    return NextResponse.json({ success: true, internalOrderId: String(order._id), paymentMode: "cod", totalAmount, discountAmount, itemsTotal });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "COD order failed." }, { status: 500 });
  }
}
