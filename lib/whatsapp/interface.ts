/**
 * Provider-agnostic WhatsApp interface.
 *
 * Implement this against any BSP (AiSensy, Meta Cloud API, Gupshup, etc.) by
 * adding a new file under lib/whatsapp/providers/ and registering it in
 * WhatsAppService.ts.
 */

export type WhatsAppMessageParams = {
  /** E.164 format, e.g. "+919876543210" */
  phone: string;
  /** Pre-approved template name (template-based providers like Meta/AiSensy) */
  templateName: string;
  /** Ordered list of variables to interpolate into the template */
  variables: string[];
  /** Optional language code, e.g. "en", "hi" */
  languageCode?: string;
  /** Optional metadata for logging/tracing */
  metadata?: Record<string, unknown>;
};

export type WhatsAppSendResult = {
  success: boolean;
  providerMessageId?: string;
  providerName: string;
  error?: string;
};

export interface IWhatsAppProvider {
  readonly name: string;
  send(params: WhatsAppMessageParams): Promise<WhatsAppSendResult>;
}
