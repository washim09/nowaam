import { model, models, Schema, type InferSchemaType, type Model } from "mongoose";

const ReviewSchema = new Schema(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    orderId: {
      type: Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    buyerName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
  },
  {
    timestamps: true,
  },
);

ReviewSchema.index({ orderId: 1, productId: 1 }, { unique: true });

export type ReviewDocument = InferSchemaType<typeof ReviewSchema>;

const Review =
  (models.Review as Model<ReviewDocument> | undefined) ||
  model<ReviewDocument>("Review", ReviewSchema);

export default Review;
