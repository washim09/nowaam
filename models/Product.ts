import { model, models, Schema, type Model, type InferSchemaType } from "mongoose";

const VariantOptionSchema = new Schema(
  {
    label: { type: String, required: true, trim: true },
    priceModifier: { type: Number, default: 0 },
    stock: { type: Number, default: null, min: 0 },
  },
  { _id: false },
);

const VariantSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    options: { type: [VariantOptionSchema], default: [] },
  },
  { _id: false },
);

const ProductSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      trim: true,
      default: "Essentials",
    },
    manufacturerName: {
      type: String,
      trim: true,
      default: "Independent Manufacturer",
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    bulkPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    minBulkQty: {
      type: Number,
      required: true,
      min: 1,
    },
    image: {
      type: String,
      required: false,
      trim: true,
      default: "",
    },
    images: {
      type: [String],
      default: [],
    },
    location: {
      type: String,
      required: true,
      trim: true,
    },
    sellerId: {
      type: String,
      index: true,
    },
    stock: {
      type: Number,
      min: 0,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    variants: {
      type: [VariantSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  },
);

ProductSchema.index({ name: "text", description: "text", manufacturerName: "text" });

export type ProductDocument = InferSchemaType<typeof ProductSchema>;

const Product =
  (models.Product as Model<ProductDocument> | undefined) ||
  model<ProductDocument>("Product", ProductSchema);

export default Product;
