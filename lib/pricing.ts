import type { CartItem, ProductRecord } from "@/types";

export function calculateUnitPrice(
  product: Pick<ProductRecord, "price" | "bulkPrice" | "minBulkQty">,
  quantity: number,
) {
  return quantity >= product.minBulkQty ? product.bulkPrice : product.price;
}

export function calculateLineTotal(
  product: Pick<ProductRecord, "price" | "bulkPrice" | "minBulkQty">,
  quantity: number,
) {
  return calculateUnitPrice(product, quantity) * quantity;
}

export function calculateCartTotal(items: CartItem[]) {
  return items.reduce((sum, item) => sum + calculateLineTotal(item, item.quantity), 0);
}

export function hasBulkDiscount(quantity: number, minBulkQty: number) {
  return quantity >= minBulkQty;
}
