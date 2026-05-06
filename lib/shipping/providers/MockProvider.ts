import type {
  BuyLabelResult,
  CreateShipmentParams,
  CreateShipmentResult,
  IShippingProvider,
  PickupResult,
  ShipmentRate,
  TrackingResult,
} from "@/lib/shipping/interfaces/ShippingProvider";

function randomId(prefix = "MOCK") {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

function mockRates(): ShipmentRate[] {
  return [
    { rateId: randomId("RATE"), carrier: "Delhivery", service: "Express",   rate: 59,  currency: "INR", deliveryDays: 2 },
    { rateId: randomId("RATE"), carrier: "DTDC",      service: "Standard",  rate: 45,  currency: "INR", deliveryDays: 4 },
    { rateId: randomId("RATE"), carrier: "BlueDart",  service: "Premium",   rate: 120, currency: "INR", deliveryDays: 1 },
  ];
}

export class MockProvider implements IShippingProvider {
  async createShipment(_params: CreateShipmentParams): Promise<CreateShipmentResult> {
    const rates = mockRates();
    const lowestRate = [...rates].sort((a, b) => a.rate - b.rate)[0];
    return {
      providerShipmentId: randomId("MOCK_SHIP"),
      rates,
      lowestRate,
    };
  }

  async buyLabel(providerShipmentId: string, _rateId: string): Promise<BuyLabelResult> {
    const awb = `NW${Date.now().toString().slice(-10)}`;
    const estimatedDeliveryDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    return {
      awbNumber: awb,
      trackingUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/track/${awb}`,
      labelUrl: `https://placehold.co/400x600/1a1a2e/ffffff?text=LABEL%0A${awb}`,
      carrier: "Delhivery",
      service: "Express",
      shippingCost: 59,
      estimatedDeliveryDate,
      trackerId: randomId("TRACKER"),
    };
  }

  async trackShipment(awbNumber: string): Promise<TrackingResult> {
    const now = new Date();
    return {
      awbNumber,
      currentStatus: "in_transit",
      carrier: "Delhivery",
      estimatedDeliveryDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      events: [
        {
          status: "shipment_created",
          description: "Shipment booked and label generated.",
          location: "Origin",
          timestamp: new Date(now.getTime() - 3 * 60 * 60 * 1000),
        },
        {
          status: "picked_up",
          description: "Package picked up by courier.",
          location: "Origin Hub",
          timestamp: new Date(now.getTime() - 2 * 60 * 60 * 1000),
        },
        {
          status: "in_transit",
          description: "Package in transit to destination.",
          location: "Sorting Center",
          timestamp: new Date(now.getTime() - 1 * 60 * 60 * 1000),
        },
      ],
    };
  }

  async cancelShipment(_providerShipmentId: string): Promise<void> {
    return;
  }

  async schedulePickup(_providerShipmentId: string, date: Date): Promise<PickupResult> {
    return {
      pickupId: randomId("PICKUP"),
      scheduledDate: date,
      confirmationNumber: `CONF_${Date.now()}`,
    };
  }
}
