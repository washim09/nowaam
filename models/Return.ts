import { model, models, Schema, type InferSchemaType, type Model } from "mongoose";

const ReturnTimelineSchema = new Schema(
  {
    status: { type: String, required: true },
    description: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    actor: { type: String },
  },
  { _id: false },
);

const ReturnSchema = new Schema(
  {
    orderId: {
      type: Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      index: true,
    },
    shipmentId: {
      type: Schema.Types.ObjectId,
      ref: "Shipment",
      index: true,
    },
    buyerId: {
      type: String,
      index: true,
    },
    sellerId: {
      type: String,
      index: true,
    },
    reason: {
      type: String,
      required: true,
      enum: [
        "damaged",
        "wrong_item",
        "not_as_described",
        "quality_issue",
        "changed_mind",
        "duplicate_order",
        "other",
      ],
    },
    description: {
      type: String,
      trim: true,
    },
    images: {
      type: [String],
      default: [],
    },
    returnStatus: {
      type: String,
      enum: [
        "requested",
        "approved",
        "rejected",
        "pickup_scheduled",
        "picked_up",
        "in_transit",
        "received",
        "inspected",
        "refund_initiated",
        "refund_completed",
        "closed",
      ],
      default: "requested",
      required: true,
      index: true,
    },
    refundStatus: {
      type: String,
      enum: ["pending", "initiated", "completed", "failed"],
      default: "pending",
    },
    refundAmount: {
      type: Number,
      default: 0,
    },
    refundTransactionId: {
      type: String,
      trim: true,
    },
    reverseShipmentId: {
      type: String,
      trim: true,
    },
    reverseAwb: {
      type: String,
      trim: true,
    },
    adminNote: {
      type: String,
      trim: true,
    },
    timeline: {
      type: [ReturnTimelineSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  },
);

export type ReturnDocument = InferSchemaType<typeof ReturnSchema>;

const Return =
  (models.Return as Model<ReturnDocument> | undefined) ||
  model<ReturnDocument>("Return", ReturnSchema);

export default Return;
