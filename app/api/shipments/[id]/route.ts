import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/auth";
import { connectToDatabase } from "@/lib/db";
import { ShippingService } from "@/lib/shipping/ShippingService";
import Order from "@/models/Order";
import Shipment from "@/models/Shipment";
import TrackingEvent from "@/models/TrackingEvent";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: RouteContext) {
  try {
    const { id } = await ctx.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid shipment ID." }, { status: 400 });
    }

    await connectToDatabase();

    const shipment = await Shipment.findById(id).lean();
    if (!shipment) {
      return NextResponse.json({ error: "Shipment not found." }, { status: 404 });
    }

    const events = await TrackingEvent.find({ shipmentId: id }).sort({ timestamp: -1 }).lean();

    return NextResponse.json({
      shipment: JSON.parse(JSON.stringify(shipment)),
      events: JSON.parse(JSON.stringify(events)),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to fetch shipment." },
      { status: 500 },
    );
  }
}

type PatchBody = {
  shipmentStatus?: string;
  awbNumber?: string;
  rateId?: string;
  carrier?: string;
  generateLabel?: boolean;
  failureNote?: string;
};

export async function PATCH(request: NextRequest, ctx: RouteContext) {
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

    const shipment = await Shipment.findById(id);
    if (!shipment) {
      return NextResponse.json({ error: "Shipment not found." }, { status: 404 });
    }

    if (
      session.user.role === "seller" &&
      String(shipment.sellerId) !== session.user.id
    ) {
      return NextResponse.json({ error: "Access denied." }, { status: 403 });
    }

    const body = (await request.json()) as PatchBody;
    const updates: Record<string, unknown> = {};
    const timelineEntry = {
      status: "",
      description: "",
      timestamp: new Date(),
    };

    if (body.shipmentStatus) {
      updates.shipmentStatus = body.shipmentStatus;
      timelineEntry.status = body.shipmentStatus;
      timelineEntry.description = `Status updated to ${body.shipmentStatus.replace(/_/g, " ")}.`;
    }

    if (body.failureNote) {
      updates.lastAttemptNote = body.failureNote;
      updates.$inc = { failedAttempts: 1 };
    }

    if (body.generateLabel && shipment.easypostShipmentId) {
      const provider = ShippingService.getProvider();
      const rateId = body.rateId ?? (shipment.rateId as string | undefined) ?? "";
      const labelResult = await provider.buyLabel(shipment.easypostShipmentId, rateId);

      updates.awbNumber = labelResult.awbNumber;
      updates.trackingUrl = labelResult.trackingUrl;
      updates.shippingLabel = labelResult.labelUrl;
      updates.carrier = labelResult.carrier;
      updates.service = labelResult.service;
      updates.shippingCost = labelResult.shippingCost;
      updates.estimatedDeliveryDate = labelResult.estimatedDeliveryDate;
      updates.easypostTrackerId = labelResult.trackerId;
      updates.shipmentStatus = "awb_assigned";

      timelineEntry.status = "awb_assigned";
      timelineEntry.description = `Label generated. AWB: ${labelResult.awbNumber} via ${labelResult.carrier}.`;

      await TrackingEvent.create({
        shipmentId: id,
        awbNumber: labelResult.awbNumber,
        status: "awb_assigned",
        description: `AWB ${labelResult.awbNumber} assigned.`,
        source: "manual",
        timestamp: new Date(),
      });
    }

    if (timelineEntry.status) {
      updates.$push = { timeline: timelineEntry };
    }

    const updated = await Shipment.findByIdAndUpdate(id, updates, { new: true }).lean();

    if (body.shipmentStatus) {
      const fulfillmentMap: Record<string, string> = {
        picked_up: "shipped",
        in_transit: "shipped",
        reached_hub: "shipped",
        out_for_delivery: "out_for_delivery",
        delivered: "delivered",
        returned_to_origin: "rto",
        failed_delivery: "shipped",
      };
      const newFulfillment = fulfillmentMap[body.shipmentStatus];
      if (newFulfillment && shipment.orderId) {
        await Order.findByIdAndUpdate(shipment.orderId, {
          $set: { fulfillmentStatus: newFulfillment },
          $push: {
            timeline: {
              status: newFulfillment,
              description: `Shipment ${body.shipmentStatus.replace(/_/g, " ")}.`,
              timestamp: new Date(),
            },
          },
        });
      }
    }

    return NextResponse.json({ shipment: JSON.parse(JSON.stringify(updated)) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to update shipment." },
      { status: 500 },
    );
  }
}

export async function DELETE(_req: NextRequest, ctx: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "admin") {
      return NextResponse.json({ error: "Admin access required." }, { status: 403 });
    }

    const { id } = await ctx.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid shipment ID." }, { status: 400 });
    }

    await connectToDatabase();

    const shipment = await Shipment.findById(id);
    if (!shipment) return NextResponse.json({ error: "Shipment not found." }, { status: 404 });

    if (shipment.easypostShipmentId && shipment.awbNumber) {
      try {
        const provider = ShippingService.getProvider();
        await provider.cancelShipment(shipment.easypostShipmentId);
      } catch (_) {}
    }

    await Shipment.findByIdAndDelete(id);
    await TrackingEvent.deleteMany({ shipmentId: id });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to cancel shipment." },
      { status: 500 },
    );
  }
}
