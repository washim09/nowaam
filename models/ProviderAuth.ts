import { model, models, Schema, type InferSchemaType, type Model } from "mongoose";

/**
 * Caches authentication tokens from third-party shipping providers
 * (Shiprocket issues 10-day JWTs). Stored in DB so all serverless
 * instances share the same token and avoid re-auth on every cold start.
 */
const ProviderAuthSchema = new Schema(
  {
    provider: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    token: {
      type: String,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
  },
  { timestamps: true },
);

export type ProviderAuthDocument = InferSchemaType<typeof ProviderAuthSchema>;

const ProviderAuth =
  (models.ProviderAuth as Model<ProviderAuthDocument> | undefined) ||
  model<ProviderAuthDocument>("ProviderAuth", ProviderAuthSchema);

export default ProviderAuth;
