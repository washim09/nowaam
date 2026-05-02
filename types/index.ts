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
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "refund_requested";

export type OrderRecord = {
  _id: string;
  productId?: string;
  quantity: number;
  totalAmount: number;
  userLocation: string;
  paymentStatus: "created" | "paid" | "failed";
  fulfillmentStatus?: FulfillmentStatus;
  items: OrderLineItem[];
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  createdAt?: string;
  updatedAt?: string;
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
