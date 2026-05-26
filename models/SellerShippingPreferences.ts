import { model, models, Schema, type InferSchemaType, type Model } from "mongoose";

const PickupAddressSchema = new Schema(
  {
    contactPerson: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    addressLine1: { type: String, required: true, trim: true },
    addressLine2: { type: String, trim: true },
    city: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    country: { type: String, required: true, trim: true, default: "India" },
    pincode: { type: String, required: true, trim: true },
  },
  { _id: false },
);

const PackageDefaultsSchema = new Schema(
  {
    weightGrams: { type: Number, default: 500 },
    lengthCm: { type: Number, default: 15 },
    widthCm: { type: Number, default: 10 },
    heightCm: { type: Number, default: 5 },
  },
  { _id: false },
);

const ProviderRegistrationSchema = new Schema(
  {
    provider: { type: String, required: true },
    nickname: { type: String, required: true },
    registeredAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const SellerShippingPreferencesSchema = new Schema(
  {
    sellerId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    pickupAddress: { type: PickupAddressSchema, required: true },
    packageDefaults: { type: PackageDefaultsSchema, default: () => ({}) },
    preferredProvider: {
      type: String,
      enum: ["shiprocket", "easypost", "mock"],
      default: "shiprocket",
    },
    autoCreateOnPayment: { type: Boolean, default: false },
    codEnabled: { type: Boolean, default: false },
    providerRegistrations: {
      type: [ProviderRegistrationSchema],
      default: [],
    },
  },
  { timestamps: true },
);

export type SellerShippingPreferencesDocument = InferSchemaType<
  typeof SellerShippingPreferencesSchema
>;

const SellerShippingPreferences =
  (models.SellerShippingPreferences as
    | Model<SellerShippingPreferencesDocument>
    | undefined) ||
  model<SellerShippingPreferencesDocument>(
    "SellerShippingPreferences",
    SellerShippingPreferencesSchema,
  );

export default SellerShippingPreferences;
