import { connectToDatabase } from "@/lib/db";
import type {
  BuyLabelResult,
  CreateShipmentParams,
  CreateShipmentResult,
  IShippingProvider,
  PickupLocationInput,
  PickupResult,
  ServiceabilityResult,
  ShipmentRate,
  TrackingResult,
} from "@/lib/shipping/interfaces/ShippingProvider";
import ProviderAuth from "@/models/ProviderAuth";

const BASE_URL = "https://apiv2.shiprocket.in/v1/external";
const PROVIDER_KEY = "shiprocket";

type ShiprocketLoginResponse = { token: string; company_id?: number };
type ShiprocketCourier = {
  courier_company_id: number;
  courier_name: string;
  rate: number;
  estimated_delivery_days?: string;
  cod: number;
  is_surface?: boolean;
};
type ShiprocketServiceabilityResponse = {
  data?: { available_courier_companies?: ShiprocketCourier[] };
};
type ShiprocketOrderCreateResponse = {
  order_id?: number;
  shipment_id?: number;
  status?: string;
};
type ShiprocketAwbAssignResponse = {
  response?: {
    data?: {
      awb_code?: string;
      courier_name?: string;
      applied_weight?: number;
      shipment_id?: number;
    };
  };
  message?: string;
};
type ShiprocketLabelResponse = { label_created?: number; label_url?: string };
type ShiprocketPickupResponse = {
  pickup_status?: number;
  response?: {
    pickup_status?: number;
    pickup_scheduled_date?: string;
    pickup_token_number?: string | number;
  };
};
type ShiprocketTrackActivity = {
  date: string;
  status: string;
  activity: string;
  location?: string;
};
type ShiprocketTrackResponse = {
  tracking_data?: {
    shipment_track?: Array<{
      awb_code: string;
      courier_name: string;
      current_status?: string;
      edd?: string;
    }>;
    shipment_track_activities?: ShiprocketTrackActivity[];
    track_url?: string;
  };
};
type ShiprocketAddPickupResponse = {
  success?: boolean;
  pickup_id?: number;
  address?: { pickup_location?: string };
};

function mapShiprocketStatus(status: string): string {
  const s = status.toLowerCase();
  if (s.includes("delivered")) return "delivered";
  if (s.includes("out for delivery")) return "out_for_delivery";
  if (s.includes("rto") || s.includes("returned")) return "returned_to_origin";
  if (s.includes("failed") || s.includes("undelivered") || s.includes("ndr"))
    return "failed_delivery";
  if (s.includes("picked up") || s.includes("pickup")) return "picked_up";
  if (s.includes("in transit") || s.includes("intransit")) return "in_transit";
  if (s.includes("reached") || s.includes("at destination")) return "reached_hub";
  if (s.includes("awb") || s.includes("manifested")) return "awb_assigned";
  return "in_transit";
}

async function shiprocketFetch<T>(
  path: string,
  token: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });
  const text = await res.text();
  let parsed: unknown;
  try {
    parsed = text ? JSON.parse(text) : {};
  } catch {
    parsed = { raw: text };
  }
  if (!res.ok) {
    const m =
      (parsed as { message?: string })?.message ?? `Shiprocket ${res.status}`;
    throw new Error(typeof m === "string" ? m : JSON.stringify(m));
  }
  return parsed as T;
}

let memoryToken: { token: string; expiresAt: Date } | null = null;

async function getToken(): Promise<string> {
  if (memoryToken && memoryToken.expiresAt.getTime() > Date.now() + 60_000) {
    return memoryToken.token;
  }
  await connectToDatabase();
  const cached = await ProviderAuth.findOne({ provider: PROVIDER_KEY });
  if (cached && cached.expiresAt.getTime() > Date.now() + 60_000) {
    memoryToken = { token: cached.token, expiresAt: cached.expiresAt };
    return cached.token;
  }
  const email = process.env.SHIPROCKET_EMAIL;
  const password = process.env.SHIPROCKET_PASSWORD;
  if (!email || !password) {
    throw new Error("SHIPROCKET_EMAIL and SHIPROCKET_PASSWORD must be set.");
  }
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Shiprocket login failed: ${res.status}`);
  }
  const data = (await res.json()) as ShiprocketLoginResponse;
  if (!data.token) throw new Error("Shiprocket login response missing token.");
  const expiresAt = new Date(Date.now() + 9 * 24 * 60 * 60 * 1000);
  await ProviderAuth.findOneAndUpdate(
    { provider: PROVIDER_KEY },
    { $set: { token: data.token, expiresAt } },
    { upsert: true },
  );
  memoryToken = { token: data.token, expiresAt };
  return data.token;
}

export class ShiprocketProvider implements IShippingProvider {
  async createShipment(params: CreateShipmentParams): Promise<CreateShipmentResult> {
    const token = await getToken();
    if (!params.referenceId) {
      throw new Error("referenceId (orderId) is required.");
    }
    const codFlag = params.paymentMode === "cod" ? 1 : 0;
    const codAmount = params.codAmount ?? 0;
    const weightKg = Math.max(0.1, params.parcel.weight / 1000);

    const serviceUrl =
      `/courier/serviceability/?pickup_postcode=${params.fromAddress.zip}` +
      `&delivery_postcode=${params.toAddress.zip}` +
      `&weight=${weightKg}&cod=${codFlag}` +
      (codFlag ? `&declared_value=${codAmount}` : "");

    const svc = await shiprocketFetch<ShiprocketServiceabilityResponse>(
      serviceUrl,
      token,
    );
    const couriers = svc.data?.available_courier_companies ?? [];
    if (couriers.length === 0) {
      throw new Error(
        `No couriers available between ${params.fromAddress.zip} and ${params.toAddress.zip}.`,
      );
    }
    const rates: ShipmentRate[] = couriers.map((c) => ({
      rateId: String(c.courier_company_id),
      carrier: c.courier_name,
      service: c.is_surface ? "Surface" : "Air",
      rate: c.rate,
      currency: "INR",
      deliveryDays: c.estimated_delivery_days
        ? parseInt(c.estimated_delivery_days, 10) || undefined
        : undefined,
    }));

    const orderPayload = {
      order_id: params.referenceId,
      order_date: new Date().toISOString().slice(0, 19).replace("T", " "),
      pickup_location: params.fromAddress.name,
      billing_customer_name: params.toAddress.name,
      billing_last_name: "",
      billing_address: params.toAddress.street1,
      billing_address_2: params.toAddress.street2 ?? "",
      billing_city: params.toAddress.city,
      billing_pincode: params.toAddress.zip,
      billing_state: params.toAddress.state,
      billing_country: params.toAddress.country,
      billing_email: "buyer@nowaam.com",
      billing_phone: params.toAddress.phone ?? "",
      shipping_is_billing: true,
      order_items: [
        {
          name: `Order ${params.referenceId}`,
          sku: params.referenceId,
          units: 1,
          selling_price: codAmount > 0 ? codAmount : 100,
          discount: 0,
          tax: 0,
          hsn: 0,
        },
      ],
      payment_method: params.paymentMode === "cod" ? "COD" : "Prepaid",
      sub_total: codAmount > 0 ? codAmount : 100,
      length: params.parcel.length ?? 10,
      breadth: params.parcel.width ?? 10,
      height: params.parcel.height ?? 5,
      weight: weightKg,
    };

    const order = await shiprocketFetch<ShiprocketOrderCreateResponse>(
      "/orders/create/adhoc",
      token,
      { method: "POST", body: JSON.stringify(orderPayload) },
    );
    if (!order.shipment_id) {
      throw new Error(`Shiprocket order creation failed: ${order.status ?? "?"}`);
    }
    const sorted = [...rates].sort((a, b) => a.rate - b.rate);
    return {
      providerShipmentId: `${order.shipment_id}:${order.order_id ?? ""}`,
      rates,
      lowestRate: sorted[0] ?? rates[0],
    };
  }

  async buyLabel(providerShipmentId: string, rateId: string): Promise<BuyLabelResult> {
    const token = await getToken();
    const [shipIdStr] = providerShipmentId.split(":");
    const shipment_id = parseInt(shipIdStr, 10);
    const courier_id = parseInt(rateId, 10);
    if (!shipment_id || !courier_id) {
      throw new Error("Invalid providerShipmentId or rateId.");
    }

    const awbResp = await shiprocketFetch<ShiprocketAwbAssignResponse>(
      "/courier/assign/awb",
      token,
      { method: "POST", body: JSON.stringify({ shipment_id, courier_id }) },
    );
    const awb = awbResp.response?.data;
    if (!awb?.awb_code) {
      throw new Error(`AWB assignment failed: ${awbResp.message ?? "no AWB"}`);
    }

    let labelUrl = "";
    try {
      const lbl = await shiprocketFetch<ShiprocketLabelResponse>(
        "/courier/generate/label",
        token,
        { method: "POST", body: JSON.stringify({ shipment_id: [shipment_id] }) },
      );
      labelUrl = lbl.label_url ?? "";
    } catch (e) {
      console.warn("[Shiprocket] Label generation deferred:", e);
    }

    return {
      awbNumber: awb.awb_code,
      trackingUrl: `https://shiprocket.co/tracking/${awb.awb_code}`,
      labelUrl,
      carrier: awb.courier_name ?? "Unknown",
      service: "Standard",
      shippingCost: 0,
    };
  }

  async trackShipment(awbNumber: string): Promise<TrackingResult> {
    const token = await getToken();
    const data = await shiprocketFetch<ShiprocketTrackResponse>(
      `/courier/track/awb/${encodeURIComponent(awbNumber)}`,
      token,
    );
    const td = data.tracking_data;
    const main = td?.shipment_track?.[0];
    const activities = td?.shipment_track_activities ?? [];

    return {
      awbNumber,
      currentStatus: mapShiprocketStatus(main?.current_status ?? "in transit"),
      carrier: main?.courier_name,
      estimatedDeliveryDate: main?.edd ? new Date(main.edd) : undefined,
      events: activities.map((a) => ({
        status: mapShiprocketStatus(a.status),
        description: a.activity,
        location: a.location,
        timestamp: new Date(a.date),
      })),
    };
  }

  async cancelShipment(providerShipmentId: string): Promise<void> {
    const token = await getToken();
    const [, orderIdStr] = providerShipmentId.split(":");
    const orderId = parseInt(orderIdStr, 10);
    if (!orderId) throw new Error("Cannot cancel: missing order id.");
    await shiprocketFetch("/orders/cancel", token, {
      method: "POST",
      body: JSON.stringify({ ids: [orderId] }),
    });
  }

  async schedulePickup(providerShipmentId: string): Promise<PickupResult> {
    const token = await getToken();
    const [shipIdStr] = providerShipmentId.split(":");
    const shipment_id = parseInt(shipIdStr, 10);
    if (!shipment_id) throw new Error("Invalid shipment id.");
    const res = await shiprocketFetch<ShiprocketPickupResponse>(
      "/courier/generate/pickup",
      token,
      { method: "POST", body: JSON.stringify({ shipment_id: [shipment_id] }) },
    );
    const r = res.response;
    return {
      pickupId: String(r?.pickup_token_number ?? shipment_id),
      scheduledDate: r?.pickup_scheduled_date
        ? new Date(r.pickup_scheduled_date)
        : new Date(),
      confirmationNumber: r?.pickup_token_number
        ? String(r.pickup_token_number)
        : undefined,
    };
  }

  async checkServiceability(
    fromPincode: string,
    toPincode: string,
    weightGrams: number,
    codAmount?: number,
  ): Promise<ServiceabilityResult> {
    const token = await getToken();
    const codFlag = (codAmount ?? 0) > 0 ? 1 : 0;
    const url =
      `/courier/serviceability/?pickup_postcode=${fromPincode}` +
      `&delivery_postcode=${toPincode}` +
      `&weight=${Math.max(0.1, weightGrams / 1000)}&cod=${codFlag}` +
      (codFlag ? `&declared_value=${codAmount ?? 0}` : "");
    const data = await shiprocketFetch<ShiprocketServiceabilityResponse>(url, token);
    const couriers = data.data?.available_courier_companies ?? [];
    if (couriers.length === 0) {
      return {
        available: false,
        codAvailable: false,
        message: "No couriers servicing this route.",
      };
    }
    const codSupported = couriers.some((c) => c.cod === 1);
    const fastest = couriers
      .map((c) => parseInt(c.estimated_delivery_days ?? "", 10))
      .filter((n) => !Number.isNaN(n))
      .sort((a, b) => a - b)[0];
    return {
      available: true,
      codAvailable: codSupported,
      estimatedDays: fastest,
    };
  }

  async registerPickupLocation(
    location: PickupLocationInput,
  ): Promise<{ nickname: string }> {
    const token = await getToken();
    const payload = {
      pickup_location: location.nickname,
      name: location.contactPerson,
      email: location.email,
      phone: location.phone,
      address: location.addressLine1,
      address_2: location.addressLine2 ?? "",
      city: location.city,
      state: location.state,
      country: location.country,
      pin_code: location.pincode,
    };
    const res = await shiprocketFetch<ShiprocketAddPickupResponse>(
      "/settings/company/addpickup",
      token,
      { method: "POST", body: JSON.stringify(payload) },
    );
    return { nickname: res.address?.pickup_location ?? location.nickname };
  }
}
