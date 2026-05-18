import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/auth";
import { connectToDatabase } from "@/lib/db";
import { createNotification, NotificationTemplates } from "@/lib/notifications";
import { sendReturnApprovedEmail, sendRefundCompletedEmail } from "@/lib/shipping-emails";
import { sendSms, SMS_TEMPLATES } from "@/lib/sms";
import Order from "@/models/Order";
import Return from "@/models/Return";
import User from "@/models/User";

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
      return NextResponse.json({ error: "Invalid return ID." }, { status: 400 });
    }

    await connectToDatabase();
    const ret = await Return.findById(id).lean();
    if (!ret) return NextResponse.json({ error: "Return not found." }, { status: 404 });

    return NextResponse.json({ return: JSON.parse(JSON.stringify(ret)) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to fetch return." },
      { status: 500 },
    );
  }
}

type PatchBody = {
  action: "approve" | "reject" | "update_status" | "initiate_refund" | "complete_refund";
  adminNote?: string;
  returnStatus?: string;
  refundAmount?: number;
  refundTransactionId?: string;
};

export async function PATCH(request: NextRequest, ctx: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }
    if (!["admin", "seller"].includes(session.user.role ?? "")) {
      return NextResponse.json({ error: "Admin or seller access required." }, { status: 403 });
    }

    const { id } = await ctx.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid return ID." }, { status: 400 });
    }

    await connectToDatabase();

    const ret = await Return.findById(id);
    if (!ret) return NextResponse.json({ error: "Return not found." }, { status: 404 });

    if (
      session.user.role === "seller" &&
      ret.sellerId &&
      String(ret.sellerId) !== session.user.id
    ) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const body = (await request.json()) as PatchBody;
    const updates: Record<string, unknown> = {};

    const order = await Order.findById(ret.orderId).lean();

    switch (body.action) {
      case "approve": {
        updates.returnStatus = "approved";
        updates.adminNote = body.adminNote;
        updates.$push = {
          timeline: {
            status: "approved",
            description: body.adminNote ?? "Return request approved.",
            timestamp: new Date(),
            actor: session.user.id,
          },
        };
        if (ret.buyerId) {
          const notif = NotificationTemplates.returnApproved(String(ret.orderId));
          await createNotification({ userId: ret.buyerId, ...notif });
          const phone = order?.deliveryAddress?.phone;
          if (phone) {
            await sendSms({ phone, message: SMS_TEMPLATES.returnApproved(String(ret.orderId)) });
          }
          const buyer = await User.findById(ret.buyerId).select("name email").lean();
          if (buyer?.email) {
            void sendReturnApprovedEmail({
              to: buyer.email,
              buyerName: buyer.name ?? "Customer",
              orderId: String(ret.orderId),
              adminNote: body.adminNote,
            });
          }
        }
        break;
      }

      case "reject": {
        updates.returnStatus = "rejected";
        updates.adminNote = body.adminNote;
        updates.$push = {
          timeline: {
            status: "rejected",
            description: body.adminNote ?? "Return request rejected.",
            timestamp: new Date(),
            actor: session.user.id,
          },
        };
        if (ret.buyerId) {
          const notif = NotificationTemplates.returnRejected(
            String(ret.orderId),
            body.adminNote ?? "Policy violation",
          );
          await createNotification({ userId: ret.buyerId, ...notif });
        }
        await Order.findByIdAndUpdate(ret.orderId, {
          $set: { fulfillmentStatus: "delivered" },
        });
        break;
      }

      case "initiate_refund": {
        if (!body.refundAmount) {
          return NextResponse.json({ error: "refundAmount is required." }, { status: 400 });
        }
        updates.returnStatus = "refund_initiated";
        updates.refundStatus = "initiated";
        updates.refundAmount = body.refundAmount;
        updates.$push = {
          timeline: {
            status: "refund_initiated",
            description: `Refund of ₹${body.refundAmount} initiated.`,
            timestamp: new Date(),
            actor: session.user.id,
          },
        };
        if (ret.buyerId) {
          const notif = NotificationTemplates.refundInitiated(String(ret.orderId), body.refundAmount);
          await createNotification({ userId: ret.buyerId, ...notif });
          const phone = order?.deliveryAddress?.phone;
          if (phone) {
            await sendSms({
              phone,
              message: SMS_TEMPLATES.refundInitiated(body.refundAmount, String(ret.orderId)),
            });
          }
        }
        break;
      }

      case "complete_refund": {
        updates.returnStatus = "refund_completed";
        updates.refundStatus = "completed";
        if (body.refundTransactionId) updates.refundTransactionId = body.refundTransactionId;
        updates.$push = {
          timeline: {
            status: "refund_completed",
            description: "Refund processed successfully.",
            timestamp: new Date(),
            actor: session.user.id,
          },
        };
        await Order.findByIdAndUpdate(ret.orderId, {
          $set: { fulfillmentStatus: "refunded" },
        });
        if (ret.buyerId) {
          const notif = NotificationTemplates.refundCompleted(
            String(ret.orderId),
            ret.refundAmount ?? 0,
          );
          await createNotification({ userId: ret.buyerId, ...notif });
          const buyer = await User.findById(ret.buyerId).select("name email").lean();
          if (buyer?.email && ret.refundAmount) {
            void sendRefundCompletedEmail({
              to: buyer.email,
              buyerName: buyer.name ?? "Customer",
              orderId: String(ret.orderId),
              amount: ret.refundAmount,
            });
          }
        }
        break;
      }

      case "update_status": {
        if (!body.returnStatus) {
          return NextResponse.json({ error: "returnStatus is required." }, { status: 400 });
        }
        updates.returnStatus = body.returnStatus;
        updates.$push = {
          timeline: {
            status: body.returnStatus,
            description: body.adminNote ?? `Status updated to ${body.returnStatus.replace(/_/g, " ")}.`,
            timestamp: new Date(),
            actor: session.user.id,
          },
        };
        break;
      }

      default:
        return NextResponse.json({ error: "Invalid action." }, { status: 400 });
    }

    const updated = await Return.findByIdAndUpdate(id, updates, { new: true }).lean();

    return NextResponse.json({ return: JSON.parse(JSON.stringify(updated)) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to update return." },
      { status: 500 },
    );
  }
}
