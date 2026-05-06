import { NextRequest, NextResponse } from "next/server";

import { connectToDatabase } from "@/lib/db";
import { ShippingService } from "@/lib/shipping/ShippingService";
import Shipment from "@/models/Shipment";
import TrackingEvent from "@/models/TrackingEvent";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ trackingId: string }> };

export async function GET(_req: NextRequest, ctx: RouteContext) {
  try {
    const { trackingId } = await ctx.params;
    if (!trackingId?.trim()) {
      return NextResponse.json({ error: "Tracking ID is required." }, { status: 400 });
    }

    await connectToDatabase();

    const shipment = await Shipment.findOne({
      $or: [{ awbNumber: trackingId }, { easypostTrackerId: trackingId }],
    }).lean();

    if (!shipment) {
      return NextResponse.json({ error: "Shipment not found for this tracking ID." }, { status: 404 });
    }

    const storedEvents = await TrackingEvent.find({ shipmentId: shipment._id })
      .sort({ timestamp: 1 })
      .lean();

    let liveEvents = storedEvents;
    try {
      const provider = ShippingService.getProvider();
      const liveTracking = await provider.trackShipment(trackingId);

      if (liveTracking.events.length > storedEvents.length) {
        const newEvents = liveTracking.events.slice(storedEvents.length);
        const docs = newEvents.map((e) => ({
          shipmentId: shipment._id,
          awbNumber: trackingId,
          status: e.status,
          description: e.description,
          location: e.location,
          timestamp: e.timestamp,
          source: "easypost" as const,
        }));
        if (docs.length > 0) {
          await TrackingEvent.insertMany(docs, { ordered: false });
        }

        const latestStatus = liveTracking.currentStatus;
        if (latestStatus !== shipment.shipmentStatus) {
          await Shipment.findByIdAndUpdate(shipment._id, {
            $set: {
              shipmentStatus: latestStatus,
              estimatedDeliveryDate: liveTracking.estimatedDeliveryDate,
            },
          });
        }

        liveEvents = await TrackingEvent.find({ shipmentId: shipment._id })
          .sort({ timestamp: 1 })
          .lean();
      }
    } catch (_) {}

    return NextResponse.json({
      shipment: JSON.parse(
        JSON.stringify({
          _id: shipment._id,
          awbNumber: shipment.awbNumber,
          courierPartner: shipment.courierPartner,
          carrier: shipment.carrier,
          service: shipment.service,
          shipmentStatus: shipment.shipmentStatus,
          estimatedDeliveryDate: shipment.estimatedDeliveryDate,
          deliveryAddress: {
            city: (shipment.deliveryAddress as Record<string, unknown>)?.city,
            state: (shipment.deliveryAddress as Record<string, unknown>)?.state,
          },
          timeline: shipment.timeline,
        }),
      ),
      events: JSON.parse(JSON.stringify(liveEvents)),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Tracking lookup failed." },
      { status: 500 },
    );
  }
}
