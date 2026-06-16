/**
 * WhatsApp template definitions.
 *
 * Each template must be pre-approved with your BSP (AiSensy/Meta) using the
 * exact template name. Variables are positional ({{1}}, {{2}}, etc.).
 *
 * To add a new template:
 *   1. Submit it to your BSP for approval with the exact name
 *   2. Add a definition here
 *   3. Use WhatsAppTemplates.<name>(...) when sending
 */

export type WhatsAppTemplate = {
  templateName: string;
  variables: string[];
  languageCode?: string;
};

export const WhatsAppTemplates = {
  orderConfirmed: (
    customerName: string,
    orderShortId: string,
    amount: number,
  ): WhatsAppTemplate => ({
    templateName: "order_confirmed",
    variables: [
      customerName,
      orderShortId,
      `\u20B9${amount.toLocaleString("en-IN")}`,
    ],
    languageCode: "en",
  }),

  shipmentCreated: (
    customerName: string,
    orderShortId: string,
    carrier: string,
    awb: string,
    trackingUrl: string,
  ): WhatsAppTemplate => ({
    templateName: "shipment_created",
    variables: [customerName, orderShortId, carrier, awb, trackingUrl],
    languageCode: "en",
  }),

  outForDelivery: (
    customerName: string,
    orderShortId: string,
    awb: string,
  ): WhatsAppTemplate => ({
    templateName: "out_for_delivery",
    variables: [customerName, orderShortId, awb],
    languageCode: "en",
  }),

  delivered: (customerName: string, orderShortId: string): WhatsAppTemplate => ({
    templateName: "delivered",
    variables: [customerName, orderShortId],
    languageCode: "en",
  }),

  ndrAlert: (
    customerName: string,
    orderShortId: string,
    reason: string,
    rescheduleUrl: string,
  ): WhatsAppTemplate => ({
    templateName: "ndr_alert",
    variables: [customerName, orderShortId, reason, rescheduleUrl],
    languageCode: "en",
  }),

  paymentConfirmed: (
    customerName: string,
    orderShortId: string,
    amount: number,
  ): WhatsAppTemplate => ({
    templateName: "payment_confirmed",
    variables: [
      customerName,
      orderShortId,
      `\u20B9${amount.toLocaleString("en-IN")}`,
    ],
    languageCode: "en",
  }),
};
