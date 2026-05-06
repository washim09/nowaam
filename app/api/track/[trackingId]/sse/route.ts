import { NextRequest } from "next/server";

import { connectToDatabase } from "@/lib/db";
import Shipment from "@/models/Shipment";
import TrackingEvent from "@/models/TrackingEvent";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ trackingId: string }> };

export async function GET(request: NextRequest, ctx: RouteContext) {
  const { trackingId } = await ctx.params;

  const encoder = new TextEncoder();
  let intervalId: ReturnType<typeof setInterval>;
  let lastEventCount = 0;
  let lastStatus = "";

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        try {
          controller.enqueue(
            encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
          );
        } catch (_) {}
      };

      send("connected", { trackingId, timestamp: new Date().toISOString() });

      const poll = async () => {
        try {
          await connectToDatabase();

          const shipment = await Shipment.findOne({
            $or: [{ awbNumber: trackingId }, { easypostTrackerId: trackingId }],
          })
            .select("shipmentStatus estimatedDeliveryDate timeline")
            .lean();

          if (!shipment) return;

          const events = await TrackingEvent.find({ shipmentId: shipment._id })
            .sort({ timestamp: 1 })
            .lean();

          const currentStatus = String(shipment.shipmentStatus);
          const currentCount = events.length;

          if (currentStatus !== lastStatus || currentCount !== lastEventCount) {
            lastStatus = currentStatus;
            lastEventCount = currentCount;
            send("update", {
              shipmentStatus: currentStatus,
              estimatedDeliveryDate: shipment.estimatedDeliveryDate,
              events: JSON.parse(JSON.stringify(events)),
              timestamp: new Date().toISOString(),
            });
          }

          if (currentStatus === "delivered" || currentStatus === "returned_to_origin") {
            send("done", { shipmentStatus: currentStatus });
            clearInterval(intervalId);
            controller.close();
          }
        } catch (_) {}
      };

      await poll();
      intervalId = setInterval(() => void poll(), 15000);

      request.signal.addEventListener("abort", () => {
        clearInterval(intervalId);
        try { controller.close(); } catch (_) {}
      });
    },

    cancel() {
      clearInterval(intervalId);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
