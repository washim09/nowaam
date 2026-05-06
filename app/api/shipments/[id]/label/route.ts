import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/auth";
import { connectToDatabase } from "@/lib/db";
import Shipment from "@/models/Shipment";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const { id } = await ctx.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid shipment ID." }, { status: 400 });
    }

    await connectToDatabase();

    const shipment = await Shipment.findById(id).select("sellerId shippingLabel awbNumber").lean();
    if (!shipment) {
      return NextResponse.json({ error: "Shipment not found." }, { status: 404 });
    }

    if (
      session.user.role === "seller" &&
      String(shipment.sellerId) !== session.user.id
    ) {
      return NextResponse.json({ error: "Access denied." }, { status: 403 });
    }

    if (!shipment.shippingLabel) {
      return NextResponse.json({ error: "No label generated yet. Buy a rate first." }, { status: 404 });
    }

    return NextResponse.json({
      labelUrl: shipment.shippingLabel,
      awbNumber: shipment.awbNumber,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to fetch label." },
      { status: 500 },
    );
  }
}
