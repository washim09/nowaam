import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { connectToDatabase } from "@/lib/db";
import Coupon from "@/models/Coupon";

export const runtime = "nodejs";

async function requireAdmin() {
  const session = await auth();
  if (session?.user?.role !== "admin") return null;
  return session;
}

export async function GET() {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json({ error: "Admin access required." }, { status: 403 });
    }
    await connectToDatabase();
    const coupons = await Coupon.find({}).sort({ createdAt: -1 }).lean();
    return NextResponse.json({ coupons: JSON.parse(JSON.stringify(coupons)) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch coupons." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json({ error: "Admin access required." }, { status: 403 });
    }
    const body = (await request.json()) as {
      code?: string;
      discountType?: "percent" | "fixed";
      discountValue?: number;
      minOrderValue?: number;
      maxUses?: number | null;
      expiresAt?: string | null;
    };
    if (!body.code?.trim() || !body.discountType || !body.discountValue) {
      return NextResponse.json({ error: "code, discountType and discountValue are required." }, { status: 400 });
    }
    await connectToDatabase();
    const coupon = await Coupon.create({
      code: body.code.trim().toUpperCase(),
      discountType: body.discountType,
      discountValue: body.discountValue,
      minOrderValue: body.minOrderValue ?? 0,
      maxUses: body.maxUses ?? null,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
    });
    return NextResponse.json({ coupon: JSON.parse(JSON.stringify(coupon)) }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create coupon." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json({ error: "Admin access required." }, { status: 403 });
    }
    const { id } = (await request.json()) as { id?: string };
    if (!id) return NextResponse.json({ error: "id required." }, { status: 400 });
    await connectToDatabase();
    await Coupon.findByIdAndDelete(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete coupon." },
      { status: 500 },
    );
  }
}
