export type ShipAddress = {
  name: string;
  phone?: string;
  street1: string;
  street2?: string;
  city: string;
  state: string;
  zip: string;
  country: string;
};

export type ShipParcel = {
  weight: number;
  length?: number;
  width?: number;
  height?: number;
};

export type CreateShipmentParams = {
  toAddress: ShipAddress;
  fromAddress: ShipAddress;
  parcel: ShipParcel;
  referenceId?: string;
  paymentMode?: "prepaid" | "cod";
  codAmount?: number;
};

export type ShipmentRate = {
  rateId: string;
  carrier: string;
  service: string;
  rate: number;
  currency: string;
  deliveryDays?: number;
};

export type CreateShipmentResult = {
  providerShipmentId: string;
  rates: ShipmentRate[];
  lowestRate: ShipmentRate;
};

export type BuyLabelResult = {
  awbNumber: string;
  trackingUrl: string;
  labelUrl: string;
  carrier: string;
  service: string;
  shippingCost: number;
  estimatedDeliveryDate?: Date;
  trackerId?: string;
};

export type TrackingEvent = {
  status: string;
  description: string;
  location?: string;
  timestamp: Date;
};

export type TrackingResult = {
  awbNumber: string;
  currentStatus: string;
  carrier?: string;
  events: TrackingEvent[];
  estimatedDeliveryDate?: Date;
};

export type PickupResult = {
  pickupId: string;
  scheduledDate: Date;
  confirmationNumber?: string;
};

export type ServiceabilityResult = {
  available: boolean;
  codAvailable: boolean;
  estimatedDays?: number;
  zone?: string;
  message?: string;
};

export type PickupLocationInput = {
  nickname: string;
  contactPerson: string;
  email: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
};

export interface IShippingProvider {
  createShipment(params: CreateShipmentParams): Promise<CreateShipmentResult>;
  buyLabel(providerShipmentId: string, rateId: string): Promise<BuyLabelResult>;
  trackShipment(awbNumber: string): Promise<TrackingResult>;
  cancelShipment(providerShipmentId: string): Promise<void>;
  schedulePickup(providerShipmentId: string, date: Date): Promise<PickupResult>;
  // Optional India-specific extensions (Shiprocket, Delhivery, etc.)
  checkServiceability?(
    fromPincode: string,
    toPincode: string,
    weightGrams: number,
    codAmount?: number,
  ): Promise<ServiceabilityResult>;
  registerPickupLocation?(location: PickupLocationInput): Promise<{ nickname: string }>;
}
