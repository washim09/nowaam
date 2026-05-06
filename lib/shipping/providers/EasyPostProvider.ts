import EasyPost from "@easypost/api";

import type {
  BuyLabelResult,
  CreateShipmentParams,
  CreateShipmentResult,
  IShippingProvider,
  PickupResult,
  ShipmentRate,
  TrackingResult,
} from "@/lib/shipping/interfaces/ShippingProvider";

function getClient(): InstanceType<typeof EasyPost> {
  const key = process.env.EASYPOST_API_KEY;
  if (!key) throw new Error("EASYPOST_API_KEY is not configured.");
  return new EasyPost(key);
}

function gramsToOunces(grams: number): number {
  return Math.max(1, Math.round(grams * 0.035274 * 100) / 100);
}

function mapEasyPostStatus(status: string): string {
  const map: Record<string, string> = {
    pre_transit: "shipment_created",
    in_transit: "in_transit",
    out_for_delivery: "out_for_delivery",
    delivered: "delivered",
    return_to_sender: "returned_to_origin",
    failure: "failed_delivery",
    unknown: "in_transit",
    error: "failed_delivery",
  };
  return map[status] ?? "in_transit";
}

export class EasyPostProvider implements IShippingProvider {
  async createShipment(params: CreateShipmentParams): Promise<CreateShipmentResult> {
    const client = getClient();

    const shipment = await client.Shipment.create({
      to_address: {
        name: params.toAddress.name,
        phone: params.toAddress.phone,
        street1: params.toAddress.street1,
        street2: params.toAddress.street2,
        city: params.toAddress.city,
        state: params.toAddress.state,
        zip: params.toAddress.zip,
        country: params.toAddress.country,
      },
      from_address: {
        name: params.fromAddress.name,
        phone: params.fromAddress.phone,
        street1: params.fromAddress.street1,
        street2: params.fromAddress.street2,
        city: params.fromAddress.city,
        state: params.fromAddress.state,
        zip: params.fromAddress.zip,
        country: params.fromAddress.country,
      },
      parcel: {
        weight: gramsToOunces(params.parcel.weight),
        length: params.parcel.length ?? 10,
        width: params.parcel.width ?? 8,
        height: params.parcel.height ?? 4,
      },
      reference: params.referenceId,
    });

    const rates: ShipmentRate[] = (shipment.rates ?? []).map((r) => ({
      rateId: r.id,
      carrier: r.carrier ?? "Unknown",
      service: r.service ?? "Standard",
      rate: parseFloat(r.rate ?? "0") * 83,
      currency: "INR",
      deliveryDays: r.delivery_days ?? undefined,
    }));

    const sortedRates = [...rates].sort((a, b) => a.rate - b.rate);
    const lowestRate = sortedRates[0] ?? rates[0];

    return {
      providerShipmentId: shipment.id,
      rates,
      lowestRate,
    };
  }

  async buyLabel(providerShipmentId: string, rateId: string): Promise<BuyLabelResult> {
    const client = getClient();

    const shipment = await client.Shipment.retrieve(providerShipmentId);
    const rate = shipment.rates?.find((r) => r.id === rateId) ?? shipment.lowestRate();
    const bought = await client.Shipment.buy(shipment.id, rate);

    const tracker = bought.tracker;
    const label = bought.postage_label;

    return {
      awbNumber: bought.tracking_code ?? bought.id,
      trackingUrl: tracker?.public_url ?? `https://track.easypost.com/${bought.tracking_code}`,
      labelUrl: label?.label_url ?? "",
      carrier: bought.selected_rate?.carrier ?? "Unknown",
      service: bought.selected_rate?.service ?? "Standard",
      shippingCost: parseFloat(bought.selected_rate?.rate ?? "0") * 83,
      estimatedDeliveryDate: bought.selected_rate?.delivery_date
        ? new Date(bought.selected_rate.delivery_date)
        : undefined,
      trackerId: tracker?.id,
    };
  }

  async trackShipment(awbNumber: string): Promise<TrackingResult> {
    const client = getClient();

    const tracker = await client.Tracker.create({
      tracking_code: awbNumber,
    });

    const events = (tracker.tracking_details ?? []).map((detail) => ({
      status: mapEasyPostStatus(detail.status ?? "unknown"),
      description: detail.message ?? detail.status ?? "Update",
      location: detail.tracking_location
        ? [
            detail.tracking_location.city,
            detail.tracking_location.state,
          ]
            .filter(Boolean)
            .join(", ")
        : undefined,
      timestamp: new Date(detail.datetime ?? Date.now()),
    }));

    return {
      awbNumber,
      currentStatus: mapEasyPostStatus(tracker.status ?? "unknown"),
      carrier: tracker.carrier,
      estimatedDeliveryDate: tracker.est_delivery_date
        ? new Date(tracker.est_delivery_date)
        : undefined,
      events,
    };
  }

  async cancelShipment(providerShipmentId: string): Promise<void> {
    const client = getClient();
    await client.Shipment.refund(providerShipmentId);
  }

  async schedulePickup(providerShipmentId: string, date: Date): Promise<PickupResult> {
    const client = getClient();

    const shipment = await client.Shipment.retrieve(providerShipmentId);

    const pickup = await client.Pickup.create({
      shipment,
      min_datetime: date.toISOString(),
      max_datetime: new Date(date.getTime() + 4 * 60 * 60 * 1000).toISOString(),
      is_account_address: false,
    });

    const buyPickup = await client.Pickup.buy(pickup.id, pickup.pickup_rates?.[0]?.carrier ?? "", pickup.pickup_rates?.[0]?.service ?? "");

    return {
      pickupId: buyPickup.id,
      scheduledDate: date,
      confirmationNumber: buyPickup.confirmation,
    };
  }
}
