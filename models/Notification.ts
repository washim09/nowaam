import { model, models, Schema, type InferSchemaType, type Model } from "mongoose";

const NotificationSchema = new Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    type: {
      type: String,
      required: true,
      enum: [
        "order_placed",
        "payment_success",
        "payment_failed",
        "shipment_created",
        "pickup_scheduled",
        "out_for_delivery",
        "delivered",
        "return_requested",
        "return_approved",
        "return_rejected",
        "refund_initiated",
        "refund_completed",
        "cod_collected",
        "system",
      ],
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    read: {
      type: Boolean,
      default: false,
      index: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  },
);

NotificationSchema.index({ userId: 1, createdAt: -1 });
NotificationSchema.index({ userId: 1, read: 1 });

export type NotificationDocument = InferSchemaType<typeof NotificationSchema>;

const Notification =
  (models.Notification as Model<NotificationDocument> | undefined) ||
  model<NotificationDocument>("Notification", NotificationSchema);

export default Notification;
