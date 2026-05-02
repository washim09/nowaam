import { model, models, Schema, type Model, type InferSchemaType } from "mongoose";

const AddressSchema = new Schema(
  {
    fullName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    addressLine: { type: String, required: true, trim: true },
    area: { type: String, trim: true },
    city: { type: String, required: true, trim: true },
    pincode: { type: String, trim: true },
  },
  { timestamps: true },
);

const UserSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ["buyer", "seller", "admin"],
      default: "buyer",
    },
    isApproved: {
      type: Boolean,
      default: true,
    },
    wishlist: {
      type: [String],
      default: [],
    },
    addresses: {
      type: [AddressSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  },
);

export type UserDocument = InferSchemaType<typeof UserSchema>;

const User =
  (models.User as Model<UserDocument> | undefined) ||
  model<UserDocument>("User", UserSchema);

export default User;
