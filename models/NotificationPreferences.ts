import { model, models, Schema, type InferSchemaType, type Model } from "mongoose";

/**
 * Per-user notification channel preferences.
 *
 * Default behaviour (when no document exists for the user) is: all channels
 * ON for transactional events. Marketing channels default OFF.
 */

const ChannelToggleSchema = new Schema(
  {
    inApp: { type: Boolean, default: true },
    email: { type: Boolean, default: true },
    sms: { type: Boolean, default: true },
    whatsapp: { type: Boolean, default: true },
  },
  { _id: false },
);

const NotificationPreferencesSchema = new Schema(
  {
    userId: { type: String, required: true, unique: true, index: true },
    // Transactional categories — default all on
    orderUpdates: { type: ChannelToggleSchema, default: () => ({}) },
    shipmentUpdates: { type: ChannelToggleSchema, default: () => ({}) },
    paymentUpdates: { type: ChannelToggleSchema, default: () => ({}) },
    returnUpdates: { type: ChannelToggleSchema, default: () => ({}) },
    // NDR / delivery alerts
    deliveryAlerts: { type: ChannelToggleSchema, default: () => ({}) },
    // Marketing — default off
    marketing: {
      type: ChannelToggleSchema,
      default: () => ({ inApp: false, email: false, sms: false, whatsapp: false }),
    },
    // Per-channel kill switches
    smsOptOut: { type: Boolean, default: false },
    whatsappOptOut: { type: Boolean, default: false },
    emailOptOut: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export type NotificationPreferencesDocument = InferSchemaType<
  typeof NotificationPreferencesSchema
>;

const NotificationPreferences =
  (models.NotificationPreferences as Model<NotificationPreferencesDocument> | undefined) ||
  model<NotificationPreferencesDocument>(
    "NotificationPreferences",
    NotificationPreferencesSchema,
  );

export default NotificationPreferences;
