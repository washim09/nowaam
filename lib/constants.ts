export const LOCATIONS = [
  "Delhi",
  "Mumbai",
  "Bengaluru",
  "Chennai",
  "Kolkata",
  "Hyderabad",
] as const;

export const LOCATION_FILTER_OPTIONS = ["All Locations", ...LOCATIONS] as const;

export const PRODUCT_CATEGORIES = [
  "Fashion",
  "Electronics",
  "Home & Living",
  "Beauty",
  "Accessories",
  "Essentials",
] as const;

export const COMPANY_NAME = "Nowaam Marketplace";
export const COMPANY_TAGLINE =
  "A multi-category marketplace where manufacturers sell retail and wholesale from one modern storefront.";
export const CART_STORAGE_KEY = "nowaam-cart";
export const WISHLIST_STORAGE_KEY = "nowaam-wishlist";
export const PROFILE_STORAGE_KEY = "nowaam-buyer-profile";
export const ORDER_HISTORY_STORAGE_KEY = "nowaam-order-history";
export const ADDRESSES_STORAGE_KEY = "nowaam-saved-addresses";
export const RECENTLY_VIEWED_STORAGE_KEY = "nowaam-recently-viewed";
export const NOTIFICATION_PREFS_STORAGE_KEY = "nowaam-notification-prefs";

// ─── Shipping & Delivery Constants ───────────────────────────────────────────

export const ORDER_STATUS = {
  PENDING_PAYMENT: "pending_payment",
  PAID: "paid",
  CONFIRMED: "confirmed",
  PROCESSING: "processing",
  PACKED: "packed",
  SHIPPED: "shipped",
  OUT_FOR_DELIVERY: "out_for_delivery",
  DELIVERED: "delivered",
  CANCELLED: "cancelled",
  RETURN_REQUESTED: "return_requested",
  RETURNED: "returned",
  REFUNDED: "refunded",
  RTO: "rto",
} as const;

export const SHIPMENT_STATUS = {
  SHIPMENT_CREATED: "shipment_created",
  AWB_ASSIGNED: "awb_assigned",
  PICKUP_SCHEDULED: "pickup_scheduled",
  PICKED_UP: "picked_up",
  IN_TRANSIT: "in_transit",
  REACHED_HUB: "reached_hub",
  OUT_FOR_DELIVERY: "out_for_delivery",
  DELIVERED: "delivered",
  FAILED_DELIVERY: "failed_delivery",
  RETURNED_TO_ORIGIN: "returned_to_origin",
} as const;

export const RETURN_STATUS = {
  REQUESTED: "requested",
  APPROVED: "approved",
  REJECTED: "rejected",
  PICKUP_SCHEDULED: "pickup_scheduled",
  PICKED_UP: "picked_up",
  IN_TRANSIT: "in_transit",
  RECEIVED: "received",
  INSPECTED: "inspected",
  REFUND_INITIATED: "refund_initiated",
  REFUND_COMPLETED: "refund_completed",
  CLOSED: "closed",
} as const;

export const PAYMENT_MODE = {
  PREPAID: "prepaid",
  COD: "cod",
} as const;

export const COURIER_PARTNER = {
  EASYPOST: "easypost",
  DELHIVERY: "Delhivery",
  BLUEDART: "BlueDart",
  DTDC: "DTDC",
  FEDEX: "FedEx",
  DHL: "DHL",
  PORTER: "Porter",
  MOCK: "mock",
} as const;

export const NOTIFICATION_TYPE = {
  ORDER_PLACED: "order_placed",
  PAYMENT_SUCCESS: "payment_success",
  PAYMENT_FAILED: "payment_failed",
  SHIPMENT_CREATED: "shipment_created",
  PICKUP_SCHEDULED: "pickup_scheduled",
  OUT_FOR_DELIVERY: "out_for_delivery",
  DELIVERED: "delivered",
  RETURN_REQUESTED: "return_requested",
  RETURN_APPROVED: "return_approved",
  RETURN_REJECTED: "return_rejected",
  REFUND_INITIATED: "refund_initiated",
  REFUND_COMPLETED: "refund_completed",
  COD_COLLECTED: "cod_collected",
  SYSTEM: "system",
} as const;

export const SHIPMENT_TIMELINE_LABELS: Record<string, { label: string; description: string }> = {
  shipment_created:     { label: "Shipment Created",    description: "Shipment has been created and is pending pickup." },
  awb_assigned:         { label: "AWB Assigned",        description: "Airway bill number generated for your shipment." },
  pickup_scheduled:     { label: "Pickup Scheduled",    description: "Courier pickup has been scheduled." },
  picked_up:            { label: "Picked Up",           description: "Package has been picked up by courier." },
  in_transit:           { label: "In Transit",          description: "Shipment is on its way to you." },
  reached_hub:          { label: "Reached Hub",         description: "Package arrived at a sorting hub." },
  out_for_delivery:     { label: "Out for Delivery",    description: "Package is out for delivery today." },
  delivered:            { label: "Delivered",           description: "Package delivered successfully." },
  failed_delivery:      { label: "Delivery Attempted",  description: "Delivery was attempted but unsuccessful." },
  returned_to_origin:   { label: "Returned to Origin",  description: "Package is being returned to the seller." },
};
