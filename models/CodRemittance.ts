import { model, models, Schema, type InferSchemaType, type Model } from "mongoose";

const CodRemittanceSchema = new Schema(
  {
    sellerId: { type: String, required: true, index: true },
    providerName: { type: String, default: "shiprocket" },
    providerRemittanceId: { type: String, index: true },
    utr: { type: String, trim: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: "INR" },
    remittanceStatus: {
      type: String,
      enum: ["pending", "processing", "paid", "on_hold", "failed"],
      default: "pending",
      index: true,
    },
    remittanceDate: { type: Date },
    payoutDate: { type: Date },
    bankReference: { type: String },
    awbList: { type: [String], default: [] },
    orderIds: { type: [String], default: [] },
    rawPayload: { type: Schema.Types.Mixed },
  },
  { timestamps: true },
);

CodRemittanceSchema.index({ sellerId: 1, remittanceStatus: 1, remittanceDate: -1 });
CodRemittanceSchema.index(
  { sellerId: 1, providerRemittanceId: 1 },
  { unique: true, sparse: true },
);

export type CodRemittanceDocument = InferSchemaType<typeof CodRemittanceSchema>;

const CodRemittance =
  (models.CodRemittance as Model<CodRemittanceDocument> | undefined) ||
  model<CodRemittanceDocument>("CodRemittance", CodRemittanceSchema);

export default CodRemittance;
