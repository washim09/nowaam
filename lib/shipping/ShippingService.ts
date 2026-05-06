import type { IShippingProvider } from "@/lib/shipping/interfaces/ShippingProvider";
import { EasyPostProvider } from "@/lib/shipping/providers/EasyPostProvider";
import { MockProvider } from "@/lib/shipping/providers/MockProvider";

export type ProviderName = "easypost" | "mock";

function resolveProvider(name?: ProviderName): IShippingProvider {
  const resolved = name ?? (process.env.SHIPPING_PROVIDER as ProviderName | undefined) ?? "mock";
  switch (resolved) {
    case "easypost":
      return new EasyPostProvider();
    case "mock":
    default:
      return new MockProvider();
  }
}

export const ShippingService = {
  getProvider(name?: ProviderName): IShippingProvider {
    return resolveProvider(name);
  },
};

export { type IShippingProvider };
export * from "@/lib/shipping/interfaces/ShippingProvider";
