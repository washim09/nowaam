import { NextResponse } from "next/server";

import { connectToDatabase } from "@/lib/db";
import Coupon from "@/models/Coupon";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const { code, orderTotal } = (await request.json()) as {
      code?: string;
      orderTotal?: number;
    };

    if (!code?.trim()) {
      return NextResponse.json({ error: "Coupon code is required." }, { status: 400 });
    }

    await connectToDatabase();

    const coupon = await Coupon.findOne({ code: code.trim().toUpperCase(), isActive: true });

    if (!coupon) {
      return NextResponse.json({ error: "Invalid or expired coupon code." }, { status: 404 });
    }

    if (coupon.expiresAt && coupon.expiresAt < new Date()) {
      return NextResponse.json({ error: "This coupon has expired." }, { status: 400 });
    }

    if (coupon.maxUses != null && coupon.usedCount >= coupon.maxUses) {
      return NextResponse.json({ error: "This coupon has reached its usage limit." }, { status: 400 });
    }

    if (orderTotal !== undefined && coupon.minOrderValue > 0 && orderTotal < coupon.minOrderValue) {
      return NextResponse.json(
        { error: `Minimum order value of ₹${coupon.minOrderValue} required for this coupon.` },
        { status: 400 },
      );
    }

    const discount =
      coupon.discountType === "percent"
        ? Math.min((orderTotal ?? 0) * (coupon.discountValue / 100), orderTotal ?? 0)
        : Math.min(coupon.discountValue, orderTotal ?? 0);

    return NextResponse.json({
      valid: true,
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      discount: Math.round(discount * 100) / 100,
      minOrderValue: coupon.minOrderValue,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to validate coupon." },
      { status: 500 },
    );
  }
}
