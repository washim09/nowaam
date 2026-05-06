export type ProductVariantOption = {
  label: string;
  priceModifier: number;
  stock?: number | null;
};

export type ProductVariant = {
  name: string;
  options: ProductVariantOption[];
};

export type SelectedVariant = {
  name: string;
  optionLabel: string;
  priceModifier: number;
};

export type ProductRecord = {
  _id: string;
  name: string;
  description: string;
  category?: string;
  manufacturerName?: string;
  price: number;
  bulkPrice: number;
  minBulkQty: number;
  image: string;
  images?: string[];
  location: string;
  sellerId?: string;
  stock?: number | null;
  isActive?: boolean;
  variants?: ProductVariant[];
  createdAt?: string;
  updatedAt?: string;
};

export type CartItem = ProductRecord & {
  quantity: number;
  cartKey: string;
  selectedVariant?: SelectedVariant;
};

export type OrderLineItem = {
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  image: string;
  location: string;
};

export type FulfillmentStatus =
  | "pending"
  | "confirmed"
  | "processing"
  | "packed"
  | "shipped"
  | "out_for_delivery"
  | "delivered"
  | "cancelled"
  | "return_requested"
  | "returned"
  | "refunded"
  | "rto"
  | "refund_requested";

export type PaymentMode = "prepaid" | "cod";

export type OrderTimeline = {
  status: string;
  description: string;
  timestamp: string;
  actor?: string;
};

export type DeliveryAddress = {
  fullName: string;
  phone: string;
  addressLine: string;
  area?: string;
  city: string;
  state?: string;
  pincode?: string;
};

export type OrderRecord = {
  _id: string;
  productId?: string;
  quantity: number;
  totalAmount: number;
  subtotal?: number;
  shippingCharge?: number;
  tax?: number;
  discountAmount?: number;
  userLocation: string;
  paymentStatus: "created" | "paid" | "failed";
  paymentMode?: PaymentMode;
  fulfillmentStatus?: FulfillmentStatus;
  items: OrderLineItem[];
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  shipmentIds?: string[];
  timeline?: OrderTimeline[];
  deliveryAddress?: DeliveryAddress;
  buyerId?: string;
  couponCode?: string;
  createdAt?: string;
  updatedAt?: string;
};

// ─── Shipment Types ───────────────────────────────────────────────────────────

export type ShipmentStatus =
  | "shipment_created"
  | "awb_assigned"
  | "pickup_scheduled"
  | "picked_up"
  | "in_transit"
  | "reached_hub"
  | "out_for_delivery"
  | "delivered"
  | "failed_delivery"
  | "returned_to_origin";

export type ShipmentTimeline = {
  status: string;
  description: string;
  location?: string;
  timestamp: string;
};

export type PackageDimensions = {
  length: number;
  width: number;
  height: number;
};

export type ShipmentRecord = {
  _id: string;
  shipmentId?: string;
  orderId: string;
  sellerId?: string;
  courierPartner?: string;
  easypostShipmentId?: string;
  easypostTrackerId?: string;
  awbNumber?: string;
  trackingUrl?: string;
  pickupAddress?: DeliveryAddress;
  deliveryAddress?: DeliveryAddress;
  packageWeight?: number;
  packageDimensions?: PackageDimensions;
  shippingLabel?: string;
  shipmentStatus: ShipmentStatus;
  estimatedDeliveryDate?: string;
  deliveryProof?: string;
  timeline?: ShipmentTimeline[];
  paymentMode?: PaymentMode;
  codAmount?: number;
  rateId?: string;
  carrier?: string;
  service?: string;
  shippingCost?: number;
  createdAt?: string;
  updatedAt?: string;
};

// ─── Tracking Event Types ─────────────────────────────────────────────────────

export type TrackingEventRecord = {
  _id: string;
  shipmentId: string;
  status: string;
  description: string;
  location?: string;
  timestamp: string;
  source?: "easypost" | "manual" | "webhook";
};

// ─── Return / RTO Types ───────────────────────────────────────────────────────

export type ReturnStatus =
  | "requested"
  | "approved"
  | "rejected"
  | "pickup_scheduled"
  | "picked_up"
  | "in_transit"
  | "received"
  | "inspected"
  | "refund_initiated"
  | "refund_completed"
  | "closed";

export type ReturnRecord = {
  _id: string;
  orderId: string;
  shipmentId?: string;
  buyerId?: string;
  sellerId?: string;
  reason: string;
  description?: string;
  images?: string[];
  returnStatus: ReturnStatus;
  refundStatus?: "pending" | "initiated" | "completed" | "failed";
  refundAmount?: number;
  refundTransactionId?: string;
  reverseShipmentId?: string;
  reverseAwb?: string;
  timeline?: OrderTimeline[];
  adminNote?: string;
  createdAt?: string;
  updatedAt?: string;
};

// ─── Notification Types ───────────────────────────────────────────────────────

export type NotificationRecord = {
  _id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  metadata?: Record<string, string>;
  createdAt?: string;
};

export type ReviewRecord = {
  _id: string;
  productId: string;
  orderId: string;
  rating: number;
  comment: string;
  buyerName: string;
  createdAt?: string;
};
