import type { IWhatsAppProvider } from "@/lib/whatsapp/interface";
import { StubWhatsAppProvider } from "@/lib/whatsapp/providers/StubProvider";

export type WhatsAppProviderName = "stub" | "aisensy" | "meta";

function resolveProvider(name?: WhatsAppProviderName): IWhatsAppProvider {
  const resolved =
    name ??
    (process.env.WHATSAPP_PROVIDER as WhatsAppProviderName | undefined) ??
    "stub";
  switch (resolved) {
    // Future:
    // case "aisensy": return new AiSensyProvider();
    // case "meta": return new MetaCloudProvider();
    case "stub":
    default:
      return new StubWhatsAppProvider();
  }
}

export const WhatsAppService = {
  getProvider(name?: WhatsAppProviderName): IWhatsAppProvider {
    return resolveProvider(name);
  },
};

export * from "@/lib/whatsapp/interface";
