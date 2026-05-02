import { model, models, Schema, type InferSchemaType, type Model } from "mongoose";

const PasswordResetSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    token: {
      type: String,
      required: true,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 },
    },
  },
  { timestamps: true },
);

export type PasswordResetDocument = InferSchemaType<typeof PasswordResetSchema>;

const PasswordReset =
  (models.PasswordReset as Model<PasswordResetDocument> | undefined) ||
  model<PasswordResetDocument>("PasswordReset", PasswordResetSchema);

export default PasswordReset;
