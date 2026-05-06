import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/auth";
import { connectToDatabase } from "@/lib/db";
import { ShippingService } from "@/lib/shipping/ShippingService";
import Shipment from "@/models/Shipment";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, ctx: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }
    if (!["seller", "admin"].includes(session.user.role ?? "")) {
      return NextResponse.json({ error: "Seller access required." }, { status: 403 });
    }

    const { id } = await ctx.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid shipment ID." }, { status: 400 });
    }

    const body = (await request.json()) as { pickupDate?: string };
    const pickupDate = body.pickupDate ? new Date(body.pickupDate) : new Date(Date.now() + 24 * 60 * 60 * 1000);

    await connectToDatabase();

    const shipment = await Shipment.findById(id);
    if (!shipment) {
      return NextResponse.json({ error: "Shipment not found." }, { status: 404 });
    }
    if (session.user.role === "seller" && String(shipment.sellerId) !== session.user.id) {
      return NextResponse.json({ error: "Access denied." }, { status: 403 });
    }
    if (!shipment.easypostShipmentId) {
      return NextResponse.json({ error: "Shipment has no provider ID. Generate label first." }, { status: 400 });
    }

    const provider = ShippingService.getProvider();
    const pickupResult = await provider.schedulePickup(shipment.easypostShipmentId, pickupDate);

    await Shipment.findByIdAndUpdate(id, {
      $set: { shipmentStatus: "pickup_scheduled" },
      $push: {
        timeline: {
          status: "pickup_scheduled",
          description: `Pickup scheduled for ${pickupDate.toLocaleDateString("en-IN")}. Confirmation: ${pickupResult.confirmationNumber ?? pickupResult.pickupId}`,
          timestamp: new Date(),
        },
      },
    });

    return NextResponse.json({ success: true, pickup: pickupResult });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to schedule pickup." },
      { status: 500 },
    );
  }
}
