import { connectToDatabase } from "@/lib/db";
import Notification from "@/models/Notification";

type CreateNotificationInput = {
  userId: string;
  type: string;
  title: string;
  message: string;
  metadata?: Record<string, string>;
};

export async function createNotification(input: CreateNotificationInput): Promise<void> {
  try {
    await connectToDatabase();
    await Notification.create(input);
  } catch (error) {
    console.error("[Notification] Failed to create:", error);
  }
}

export async function createBulkNotifications(inputs: CreateNotificationInput[]): Promise<void> {
  if (!inputs.length) return;
  try {
    await connectToDatabase();
    await Notification.insertMany(inputs);
  } catch (error) {
    console.error("[Notification] Failed to create bulk:", error);
  }
}

export const NotificationTemplates = {
  orderPlaced: (orderId: string) => ({
    type: "order_placed",
    title: "Order Placed",
    message: `Your order has been placed successfully. Order ID: ${orderId.slice(-8)}`,
    metadata: { orderId },
  }),

  paymentSuccess: (orderId: string, amount: number) => ({
    type: "payment_success",
    title: "Payment Confirmed",
    message: `Payment of ₹${amount.toLocaleString("en-IN")} confirmed for order ${orderId.slice(-8)}.`,
    metadata: { orderId, amount: String(amount) },
  }),

  orderPacked: (orderId: string) => ({
    type: "order_packed",
    title: "Order Packed",
    message: `Your order ${orderId.slice(-8)} has been packed and is ready to ship.`,
    metadata: { orderId },
  }),

  shipmentCreated: (orderId: string, awb: string, carrier: string) => ({
    type: "shipment_created",
    title: "Order Shipped",
    message: `Your order has been shipped via ${carrier}. AWB: ${awb}`,
    metadata: { orderId, awb, carrier },
  }),

  outForDelivery: (orderId: string, awb: string) => ({
    type: "out_for_delivery",
    title: "Out for Delivery",
    message: "Your package is out for delivery today. Please be available.",
    metadata: { orderId, awb },
  }),

  delivered: (orderId: string) => ({
    type: "delivered",
    title: "Order Delivered",
    message: `Your order ${orderId.slice(-8)} has been delivered. Enjoy!`,
    metadata: { orderId },
  }),

  returnApproved: (orderId: string) => ({
    type: "return_approved",
    title: "Return Approved",
    message: `Your return request for order ${orderId.slice(-8)} has been approved.`,
    metadata: { orderId },
  }),

  returnRejected: (orderId: string, reason: string) => ({
    type: "return_rejected",
    title: "Return Request Rejected",
    message: `Return for order ${orderId.slice(-8)} was rejected. Reason: ${reason}`,
    metadata: { orderId, reason },
  }),

  refundInitiated: (orderId: string, amount: number) => ({
    type: "refund_initiated",
    title: "Refund Initiated",
    message: `Refund of ₹${amount.toLocaleString("en-IN")} for order ${orderId.slice(-8)} has been initiated.`,
    metadata: { orderId, amount: String(amount) },
  }),

  refundCompleted: (orderId: string, amount: number) => ({
    type: "refund_completed",
    title: "Refund Completed",
    message: `₹${amount.toLocaleString("en-IN")} has been credited for order ${orderId.slice(-8)}.`,
    metadata: { orderId, amount: String(amount) },
  }),

  // Seller-facing
  shipmentAutoCreated: (orderId: string, provider: string) => ({
    type: "shipment_auto_created",
    title: "Shipment auto-created",
    message: `A shipment was created automatically for order ${orderId.slice(-8)} via ${provider}. Pick a courier rate to generate the label.`,
    metadata: { orderId, provider },
  }),

  shipmentAutoCreateFailed: (orderId: string, reason: string) => ({
    type: "shipment_auto_create_failed",
    title: "Auto-shipment failed — action needed",
    message: `Couldn't auto-create the shipment for order ${orderId.slice(-8)}: ${reason}. Please create it manually from the Shipments tab.`,
    metadata: { orderId, reason },
  }),

  ndrCreated: (orderId: string, awb: string, reason: string) => ({
    type: "ndr_created",
    title: "Delivery attempt failed",
    message: `Delivery failed for order ${orderId.slice(-8)} (AWB ${awb}): ${reason}. Take action from the NDR tab.`,
    metadata: { orderId, awb, reason },
  }),
};
