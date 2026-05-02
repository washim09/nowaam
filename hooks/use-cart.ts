"use client";

import { useEffect, useMemo, useState } from "react";

import { CART_STORAGE_KEY } from "@/lib/constants";
import { calculateCartTotal } from "@/lib/pricing";
import { clampQuantity } from "@/lib/utils";
import type { CartItem, ProductRecord, SelectedVariant } from "@/types";

function buildCartKey(productId: string, variant?: SelectedVariant): string {
  if (!variant) return productId;
  return `${productId}|${variant.name}:${variant.optionLabel}`;
}

function readCart() {
  if (typeof window === "undefined") {
    return [] as CartItem[];
  }

  try {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Array<CartItem & { cartKey?: string }>;
    return parsed.map((item) =>
      item.cartKey ? item : { ...item, cartKey: item._id },
    ) as CartItem[];
  } catch {
    return [];
  }
}

function writeCart(items: CartItem[]) {
  window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  window.dispatchEvent(new Event("cart-updated"));
}

export function useCart() {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    const syncCart = () => {
      setItems(readCart());
      setIsHydrated(true);
    };

    syncCart();
    window.addEventListener("storage", syncCart);
    window.addEventListener("cart-updated", syncCart);

    return () => {
      window.removeEventListener("storage", syncCart);
      window.removeEventListener("cart-updated", syncCart);
    };
  }, []);

  const totalItems = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity, 0),
    [items],
  );

  const subtotal = useMemo(() => calculateCartTotal(items), [items]);

  const addItem = (product: ProductRecord, quantity: number, variant?: SelectedVariant) => {
    const normalizedQuantity = clampQuantity(quantity);
    const cartKey = buildCartKey(product._id, variant);
    const nextItems = [...items];
    const itemIndex = nextItems.findIndex((item) => item.cartKey === cartKey);

    if (itemIndex >= 0) {
      nextItems[itemIndex] = {
        ...nextItems[itemIndex],
        quantity: nextItems[itemIndex].quantity + normalizedQuantity,
      };
    } else {
      const modifier = variant?.priceModifier ?? 0;
      nextItems.push({
        ...product,
        price: product.price + modifier,
        bulkPrice: product.bulkPrice + modifier,
        quantity: normalizedQuantity,
        cartKey,
        selectedVariant: variant,
      });
    }

    setItems(nextItems);
    writeCart(nextItems);
  };

  const updateQuantity = (cartKey: string, quantity: number) => {
    const normalizedQuantity = clampQuantity(quantity);
    const nextItems = items.map((item) =>
      item.cartKey === cartKey ? { ...item, quantity: normalizedQuantity } : item,
    );

    setItems(nextItems);
    writeCart(nextItems);
  };

  const removeItem = (cartKey: string) => {
    const nextItems = items.filter((item) => item.cartKey !== cartKey);
    setItems(nextItems);
    writeCart(nextItems);
  };

  const clearCart = () => {
    setItems([]);
    writeCart([]);
  };

  return {
    items,
    isHydrated,
    totalItems,
    subtotal,
    addItem,
    updateQuantity,
    removeItem,
    clearCart,
  };
}
