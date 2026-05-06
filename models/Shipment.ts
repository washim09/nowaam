import { model, models, Schema, type InferSchemaType, type Model } from "mongoose";

const AddressSchema = new Schema(
  {
    fullName: { type: String, trim: true },
    phone: { type: String, trim: true },
    addressLine: { type: String, trim: true },
    area: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    pincode: { type: String, trim: true },
    country: { type: String, trim: true, default: "India" },
  },
  { _id: false },
);

const DimensionsSchema = new Schema(
  {
    length: { type: Number },
    width: { type: Number },
    height: { type: Number },
    unit: { type: String, default: "cm" },
  },
  { _id: false },
);

const ShipmentTimelineSchema = new Schema(
  {
    status: { type: String, required: true },
    description: { type: String, required: true },
    location: { type: String },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false },
);

const ShipmentSchema = new Schema(
  {
    orderId: {
      type: Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      index: true,
    },
    sellerId: {
      type: String,
      index: true,
    },
    courierPartner: {
      type: String,
      trim: true,
    },
    easypostShipmentId: {
      type: String,
      trim: true,
      sparse: true,
    },
    easypostTrackerId: {
      type: String,
      trim: true,
      sparse: true,
    },
    awbNumber: {
      type: String,
      trim: true,
      sparse: true,
      index: true,
    },
    trackingUrl: {
      type: String,
      trim: true,
    },
    pickupAddress: {
      type: AddressSchema,
    },
    deliveryAddress: {
      type: AddressSchema,
    },
    packageWeight: {
      type: Number,
    },
    packageDimensions: {
      type: DimensionsSchema,
    },
    shippingLabel: {
      type: String,
      trim: true,
    },
    shipmentStatus: {
      type: String,
      enum: [
        "shipment_created",
        "awb_assigned",
        "pickup_scheduled",
        "picked_up",
        "in_transit",
        "reached_hub",
        "out_for_delivery",
        "delivered",
        "failed_delivery",
        "returned_to_origin",
      ],
      default: "shipment_created",
      required: true,
      index: true,
    },
    estimatedDeliveryDate: {
      type: Date,
    },
    deliveryProof: {
      type: String,
      trim: true,
    },
    timeline: {
      type: [ShipmentTimelineSchema],
      default: [],
    },
    paymentMode: {
      type: String,
      enum: ["prepaid", "cod"],
      default: "prepaid",
    },
    codAmount: {
      type: Number,
      default: 0,
    },
    rateId: {
      type: String,
      trim: true,
    },
    carrier: {
      type: String,
      trim: true,
    },
    service: {
      type: String,
      trim: true,
    },
    shippingCost: {
      type: Number,
      default: 0,
    },
    failedAttempts: {
      type: Number,
      default: 0,
    },
    lastAttemptNote: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  },
);

export type ShipmentDocument = InferSchemaType<typeof ShipmentSchema>;

const Shipment =
  (models.Shipment as Model<ShipmentDocument> | undefined) ||
  model<ShipmentDocument>("Shipment", ShipmentSchema);

export default Shipment;
