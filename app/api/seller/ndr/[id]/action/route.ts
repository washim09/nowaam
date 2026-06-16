import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/auth";
import { connectToDatabase } from "@/lib/db";
import { logger } from "@/lib/logger";
import {
  ShippingService,
  type NdrAction,
  type ProviderName,
} from "@/lib/shipping/ShippingService";
import NDR from "@/models/NDR";

export const runtime = "nodejs";

type ActionBody = {
  action: "reattempt" | "rto" | "edit_address";
  comment?: string;
  phone?: string;
  address?: string;
};

/**
 * Submit an NDR action (re-attempt, RTO, or edit-address-and-reattempt)
 * to the courier provider, and record the outcome locally.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const log = logger.child({ route: "seller/ndr/action", ndrId: id });

  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }
    if (!["seller", "admin"].includes(session.user.role ?? "")) {
      return NextResponse.json({ error: "Seller access required." }, { status: 403 });
    }
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid NDR id." }, { status: 400 });
    }

    const body = (await request.json()) as ActionBody;
    if (!["reattempt", "rto", "edit_address"].includes(body.action)) {
      return NextResponse.json({ error: "Invalid action." }, { status: 400 });
    }

    await connectToDatabase();

    const ndr = await NDR.findById(id);
    if (!ndr) return NextResponse.json({ error: "NDR not found." }, { status: 404 });

    // Sellers can only act on their own NDRs
    if (session.user.role === "seller" && String(ndr.sellerId) !== session.user.id) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }
    if (ndr.ndrStatus === "resolved" || ndr.ndrStatus === "rto_initiated") {
      return NextResponse.json(
        { error: `NDR already ${ndr.ndrStatus}.` },
        { status: 409 },
      );
    }

    // Build provider action payload
    let providerAction: NdrAction;
    switch (body.action) {
      case "reattempt":
        providerAction = { kind: "reattempt", comment: body.comment };
        break;
      case "rto":
        providerAction = { kind: "rto", comment: body.comment };
        break;
      case "edit_address":
        if (!body.phone && !body.address) {
          return NextResponse.json(
            { error: "Provide a new phone or address." },
            { status: 400 },
          );
        }
        providerAction = {
          kind: "edit_address",
          phone: body.phone,
          address: body.address,
          comment: body.comment,
        };
        break;
    }

    const provider = ShippingService.getProvider(
      (ndr.providerName ?? "shiprocket") as ProviderName,
    );
    if (typeof provider.submitNdrAction !== "function") {
      return NextResponse.json(
        { error: "This provider doesn't support NDR actions." },
        { status: 400 },
      );
    }

    const result = await provider.submitNdrAction(ndr.awbNumber, providerAction);

    const newStatus = body.action === "rto" ? "rto_initiated" : "action_taken";
    await NDR.findByIdAndUpdate(id, {
      $set: {
        ndrStatus: newStatus,
        sellerAction: body.action,
        sellerNote: body.comment,
        providerActionId: result.providerActionId,
      },
      $push: {
        timeline: {
          action: `seller_${body.action}`,
          description:
            body.comment ?? `Seller submitted ${body.action} via ${ndr.providerName}.`,
          timestamp: new Date(),
          actor: session.user.name ?? session.user.id,
        },
      },
    });

    log.info("ndr.action_submitted", {
      sellerId: session.user.id,
      action: body.action,
      awb: ndr.awbNumber,
    });

    return NextResponse.json({ success: true, message: result.message });
  } catch (error) {
    log.error("ndr.action_failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to submit NDR action." },
      { status: 500 },
    );
  }
}
