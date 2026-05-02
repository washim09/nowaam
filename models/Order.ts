import { model, models, Schema, type InferSchemaType, type Model } from "mongoose";

const DeliveryAddressSchema = new Schema(
  {
    fullName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    addressLine: { type: String, required: true, trim: true },
    area: { type: String, trim: true },
    city: { type: String, required: true, trim: true },
    pincode: { type: String, trim: true },
  },
  { _id: false },
);

const OrderItemSchema = new Schema(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    sellerId: {
      type: String,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    unitPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    totalPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    image: {
      type: String,
      required: true,
      trim: true,
    },
    location: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    _id: false,
  },
);

const OrderSchema = new Schema(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: false,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    userLocation: {
      type: String,
      required: true,
      trim: true,
    },
    paymentStatus: {
      type: String,
      enum: ["created", "paid", "failed"],
      default: "created",
      required: true,
    },
    fulfillmentStatus: {
      type: String,
      enum: ["pending", "processing", "shipped", "delivered", "cancelled", "refund_requested"],
    },
    razorpayOrderId: {
      type: String,
      trim: true,
    },
    razorpayPaymentId: {
      type: String,
      trim: true,
    },
    buyerId: {
      type: String,
      index: true,
    },
    deliveryAddress: {
      type: DeliveryAddressSchema,
    },
    couponCode: {
      type: String,
      trim: true,
    },
    discountAmount: {
      type: Number,
      default: 0,
    },
    items: {
      type: [OrderItemSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  },
);

export type OrderDocument = InferSchemaType<typeof OrderSchema>;

const Order =
  (models.Order as Model<OrderDocument> | undefined) || model<OrderDocument>("Order", OrderSchema);

export default Order;
