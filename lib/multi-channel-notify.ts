import { logger } from "@/lib/logger";
import { createNotification } from "@/lib/notifications";
import NotificationPreferences from "@/models/NotificationPreferences";
import { WhatsAppService } from "@/lib/whatsapp/WhatsAppService";
import type { WhatsAppTemplate } from "@/lib/whatsapp/templates";

/**
 * Multi-channel notification dispatcher.
 *
 * Respects per-user notification preferences. Each channel is best-effort —
 * a failure in one channel does not affect the others.
 *
 * Categories map to fields on NotificationPreferences:
 *   - order_updates, shipment_updates, payment_updates, return_updates
 *   - delivery_alerts, marketing
 */

export type NotificationCategory =
  | "order_updates"
  | "shipment_updates"
  | "payment_updates"
  | "return_updates"
  | "delivery_alerts"
  | "marketing";

const CATEGORY_FIELD: Record<NotificationCategory, string> = {
  order_updates: "orderUpdates",
  shipment_updates: "shipmentUpdates",
  payment_updates: "paymentUpdates",
  return_updates: "returnUpdates",
  delivery_alerts: "deliveryAlerts",
  marketing: "marketing",
};

export type MultiChannelPayload = {
  userId: string;
  category: NotificationCategory;
  inApp?: {
    type: string;
    title: string;
    message: string;
    metadata?: Record<string, string>;
  };
  email?: {
    to: string;
    send: () => Promise<unknown>;
  };
  sms?: {
    phone: string;
    send: () => Promise<unknown>;
  };
  whatsapp?: {
    phone: string;
    template: WhatsAppTemplate;
    metadata?: Record<string, unknown>;
  };
};

type ChannelToggle = {
  inApp?: boolean;
  email?: boolean;
  sms?: boolean;
  whatsapp?: boolean;
};

type PrefsDoc = {
  smsOptOut?: boolean;
  whatsappOptOut?: boolean;
  emailOptOut?: boolean;
} & Record<string, ChannelToggle | boolean | unknown>;

async function getPrefs(userId: string): Promise<PrefsDoc | null> {
  try {
    return (await NotificationPreferences.findOne({ userId }).lean()) as PrefsDoc | null;
  } catch {
    return null;
  }
}

function channelAllowed(
  prefs: PrefsDoc | null,
  category: NotificationCategory,
  channel: keyof ChannelToggle,
): boolean {
  if (!prefs) return true; // default-on if no prefs doc
  if (channel === "sms" && prefs.smsOptOut) return false;
  if (channel === "whatsapp" && prefs.whatsappOptOut) return false;
  if (channel === "email" && prefs.emailOptOut) return false;
  const field = CATEGORY_FIELD[category];
  const toggle = prefs[field] as ChannelToggle | undefined;
  if (!toggle) return true;
  return toggle[channel] !== false;
}

export async function dispatchMultiChannel(payload: MultiChannelPayload): Promise<void> {
  const prefs = await getPrefs(payload.userId);
  const log = logger.child({
    component: "multi-channel-notify",
    userId: payload.userId,
    category: payload.category,
  });

  // In-app
  if (payload.inApp && channelAllowed(prefs, payload.category, "inApp")) {
    try {
      await createNotification({
        userId: payload.userId,
        type: payload.inApp.type,
        title: payload.inApp.title,
        message: payload.inApp.message,
        metadata: payload.inApp.metadata,
      });
    } catch (err) {
      log.error("inapp_failed", { error: err instanceof Error ? err.message : String(err) });
    }
  }

  // Email
  if (payload.email && channelAllowed(prefs, payload.category, "email")) {
    try {
      await payload.email.send();
    } catch (err) {
      log.error("email_failed", { error: err instanceof Error ? err.message : String(err) });
    }
  }

  // SMS
  if (payload.sms && channelAllowed(prefs, payload.category, "sms")) {
    try {
      await payload.sms.send();
    } catch (err) {
      log.error("sms_failed", { error: err instanceof Error ? err.message : String(err) });
    }
  }

  // WhatsApp
  if (payload.whatsapp && channelAllowed(prefs, payload.category, "whatsapp")) {
    try {
      const provider = WhatsAppService.getProvider();
      const result = await provider.send({
        phone: payload.whatsapp.phone,
        templateName: payload.whatsapp.template.templateName,
        variables: payload.whatsapp.template.variables,
        languageCode: payload.whatsapp.template.languageCode,
        metadata: payload.whatsapp.metadata,
      });
      if (!result.success) {
        log.warn("whatsapp_send_failed", { error: result.error, provider: result.providerName });
      }
    } catch (err) {
      log.error("whatsapp_failed", { error: err instanceof Error ? err.message : String(err) });
    }
  }
}
