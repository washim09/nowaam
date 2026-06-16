import { logger } from "@/lib/logger";
import type {
  IWhatsAppProvider,
  WhatsAppMessageParams,
  WhatsAppSendResult,
} from "@/lib/whatsapp/interface";

/**
 * Stub provider — logs the message and returns success without actually
 * sending. Used in dev or until a real BSP is configured.
 */
export class StubWhatsAppProvider implements IWhatsAppProvider {
  readonly name = "stub";

  async send(params: WhatsAppMessageParams): Promise<WhatsAppSendResult> {
    logger.info("whatsapp.stub_send", {
      phone: maskPhone(params.phone),
      template: params.templateName,
      variableCount: params.variables.length,
      language: params.languageCode ?? "en",
      ...params.metadata,
    });
    return {
      success: true,
      providerMessageId: `stub_${Date.now()}`,
      providerName: this.name,
    };
  }
}

function maskPhone(phone: string): string {
  if (phone.length <= 4) return phone;
  return phone.slice(0, 3) + "****" + phone.slice(-3);
}
