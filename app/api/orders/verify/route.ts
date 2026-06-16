import mongoose from "mongoose";
import { NextResponse } from "next/server";

import { connectToDatabase } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { formatCurrency } from "@/lib/utils";
import { verifyRazorpaySignature } from "@/lib/razorpay";
import { autoCreateShipmentsForOrder } from "@/lib/shipping/auto-create-shipments";
import Order from "@/models/Order";
import User from "@/models/User";

export const runtime = "nodejs";

type OrderDoc = {
  _id: unknown;
  buyerId?: string | null;
  totalAmount?: number;
  discountAmount?: number;
  userLocation?: string;
  items?: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    sellerId?: string | null;
  }>;
  deliveryAddress?: {
    fullName?: string;
    addressLine?: string;
    city?: string;
    phone?: string;
  } | null;
};

async function sendOrderEmails(order: OrderDoc) {
  try {
    const orderId = String(order._id);
    const itemsHtml = (order.items ?? [])
      .map(
        (i) =>
          `<tr><td style="padding:4px 8px">${i.name}</td><td style="padding:4px 8px;text-align:center">${i.quantity}</td><td style="padding:4px 8px;text-align:right">${formatCurrency(i.totalPrice)}</td></tr>`,
      )
      .join("");

    const addr = order.deliveryAddress;
    const addrText = addr
      ? `${addr.fullName ?? ""}, ${addr.addressLine ?? ""}, ${addr.city ?? ""}`
      : order.userLocation ?? "—";

    const total = formatCurrency(order.totalAmount ?? 0);

    if (order.buyerId) {
      const buyer = await User.findById(order.buyerId).select("email name").lean();
      if (buyer?.email) {
        await sendEmail({
          to: buyer.email,
          subject: `Order confirmed — #${orderId.slice(-8).toUpperCase()}`,
          html: `
            <div style="font-family:sans-serif;max-width:520px;margin:0 auto">
              <h2 style="color:#3b1f0e">Your order is confirmed!</h2>
              <p>Hi ${buyer.name ?? "there"},</p>
              <p>Your payment was successful. Here's your order summary:</p>
              <table style="width:100%;border-collapse:collapse;margin:16px 0">
                <thead><tr style="background:#f5f0eb">
                  <th style="padding:6px 8px;text-align:left">Item</th>
                  <th style="padding:6px 8px">Qty</th>
                  <th style="padding:6px 8px;text-align:right">Total</th>
                </tr></thead>
                <tbody>${itemsHtml}</tbody>
              </table>
              <p><strong>Delivery to:</strong> ${addrText}</p>
              <p><strong>Order total:</strong> ${total}</p>
              <p style="color:#888;font-size:12px">Order ID: ${orderId}</p>
            </div>`,
        });
      }
    }

    const sellerIds = [
      ...new Set(
        (order.items ?? [])
          .map((i) => i.sellerId)
          .filter((id): id is string => typeof id === "string" && id.length > 0),
      ),
    ];

    for (const sellerId of sellerIds) {
      const seller = await User.findById(sellerId).select("email name").lean();
      if (!seller?.email) continue;
      const sellerItems = (order.items ?? []).filter((i) => i.sellerId === sellerId);
      const sellerItemsHtml = sellerItems
        .map(
          (i) =>
            `<tr><td style="padding:4px 8px">${i.name}</td><td style="padding:4px 8px;text-align:center">${i.quantity}</td><td style="padding:4px 8px;text-align:right">${formatCurrency(i.unitPrice)} each</td></tr>`,
        )
        .join("");
      await sendEmail({
        to: seller.email,
        subject: `New order received — #${orderId.slice(-8).toUpperCase()}`,
        html: `
          <div style="font-family:sans-serif;max-width:520px;margin:0 auto">
            <h2 style="color:#3b1f0e">You have a new order!</h2>
            <p>Hi ${seller.name ?? "there"}, a buyer has placed an order for your products.</p>
            <table style="width:100%;border-collapse:collapse;margin:16px 0">
              <thead><tr style="background:#f5f0eb">
                <th style="padding:6px 8px;text-align:left">Item</th>
                <th style="padding:6px 8px">Qty</th>
                <th style="padding:6px 8px;text-align:right">Unit price</th>
              </tr></thead>
              <tbody>${sellerItemsHtml}</tbody>
            </table>
            <p><strong>Ship to:</strong> ${addrText}</p>
            <p style="color:#888;font-size:12px">Order ID: ${orderId} — Log in to your seller dashboard to update the fulfillment status.</p>
          </div>`,
      });
    }
  } catch (err) {
    console.error("[verify] Email send error:", err);
  }
}

type VerifyOrderPayload = {
  internalOrderId?: string;
  razorpay_order_id?: string;
  razorpay_payment_id?: string;
  razorpay_signature?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as VerifyOrderPayload;

    if (
      !body.internalOrderId ||
      !body.razorpay_order_id ||
      !body.razorpay_payment_id ||
      !body.razorpay_signature
    ) {
      return NextResponse.json({ error: "Missing payment verification fields." }, { status: 400 });
    }

    if (!mongoose.Types.ObjectId.isValid(body.internalOrderId)) {
      return NextResponse.json({ error: "Invalid internal order ID." }, { status: 400 });
    }

    await connectToDatabase();

    const isValidSignature = verifyRazorpaySignature({
      orderId: body.razorpay_order_id,
      paymentId: body.razorpay_payment_id,
      signature: body.razorpay_signature,
    });

    if (!isValidSignature) {
      await Order.findByIdAndUpdate(body.internalOrderId, {
        paymentStatus: "failed",
      });

      return NextResponse.json({ error: "Invalid Razorpay signature." }, { status: 400 });
    }

    const updatedOrder = await Order.findOneAndUpdate(
      {
        _id: body.internalOrderId,
        razorpayOrderId: body.razorpay_order_id,
      },
      {
        paymentStatus: "paid",
        razorpayPaymentId: body.razorpay_payment_id,
      },
      { new: true },
    ).lean();

    if (!updatedOrder) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }

    void sendOrderEmails(updatedOrder);

    // Phase 3: Auto-create shipments for sellers who have opted in.
    // Fire-and-forget — never blocks payment success.
    void autoCreateShipmentsForOrder(String(updatedOrder._id)).catch((err) => {
      console.error("[verify] auto-create-shipments error:", err);
    });

    return NextResponse.json({
      success: true,
      order: JSON.parse(JSON.stringify(updatedOrder)),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to verify payment.",
      },
      { status: 500 },
    );
  }
}
