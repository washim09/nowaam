import { model, models, Schema, type InferSchemaType, type Model } from "mongoose";

const NDRTimelineSchema = new Schema(
  {
    action: { type: String, required: true },
    description: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    actor: { type: String },
  },
  { _id: false },
);

const NDRSchema = new Schema(
  {
    shipmentId: { type: Schema.Types.ObjectId, ref: "Shipment", required: true, index: true },
    orderId: { type: Schema.Types.ObjectId, ref: "Order", required: true, index: true },
    sellerId: { type: String, required: true, index: true },
    awbNumber: { type: String, required: true, index: true },
    providerName: { type: String, default: "shiprocket" },
    attemptCount: { type: Number, default: 1 },
    lastAttemptDate: { type: Date, default: Date.now },
    reason: { type: String, required: true },
    reasonDetail: { type: String },
    location: { type: String },
    ndrStatus: {
      type: String,
      enum: ["pending", "action_taken", "resolved", "cancelled", "rto_initiated"],
      default: "pending",
      index: true,
    },
    sellerAction: {
      type: String,
      enum: ["reattempt", "rto", "edit_address", "none"],
      default: "none",
    },
    sellerNote: { type: String },
    providerActionId: { type: String },
    timeline: { type: [NDRTimelineSchema], default: [] },
  },
  { timestamps: true },
);

NDRSchema.index({ sellerId: 1, ndrStatus: 1, createdAt: -1 });

export type NDRDocument = InferSchemaType<typeof NDRSchema>;

const NDR =
  (models.NDR as Model<NDRDocument> | undefined) || model<NDRDocument>("NDR", NDRSchema);

export default NDR;
