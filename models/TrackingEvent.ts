import { model, models, Schema, type InferSchemaType, type Model } from "mongoose";

const TrackingEventSchema = new Schema(
  {
    shipmentId: {
      type: Schema.Types.ObjectId,
      ref: "Shipment",
      required: true,
      index: true,
    },
    awbNumber: {
      type: String,
      trim: true,
      index: true,
    },
    status: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    location: {
      type: String,
      trim: true,
    },
    timestamp: {
      type: Date,
      required: true,
      default: Date.now,
    },
    source: {
      type: String,
      enum: ["easypost", "manual", "webhook"],
      default: "manual",
    },
    rawPayload: {
      type: Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
  },
);

TrackingEventSchema.index({ shipmentId: 1, timestamp: -1 });

export type TrackingEventDocument = InferSchemaType<typeof TrackingEventSchema>;

const TrackingEvent =
  (models.TrackingEvent as Model<TrackingEventDocument> | undefined) ||
  model<TrackingEventDocument>("TrackingEvent", TrackingEventSchema);

export default TrackingEvent;
