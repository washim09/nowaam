"use client";

import { useSession } from "next-auth/react";
import { useEffect, useMemo, useState } from "react";

import { CART_STORAGE_KEY } from "@/lib/constants";
import { calculateCartTotal } from "@/lib/pricing";
import { clampQuantity } from "@/lib/utils";
import type { CartItem, ProductRecord, SelectedVariant } from "@/types";

function buildCartKey(productId: string, variant?: SelectedVariant): string {
  if (!variant) return productId;
  return `${productId}|${variant.name}:${variant.optionLabel}`;
}

function activeKey(userId?: string): string {
  return userId ? `${CART_STORAGE_KEY}-${userId}` : CART_STORAGE_KEY;
}

function readCart(key: string): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Array<CartItem & { cartKey?: string }>;
    return parsed.map((item) =>
      item.cartKey ? item : { ...item, cartKey: item._id },
    ) as CartItem[];
  } catch {
    return [];
  }
}

function writeCart(items: CartItem[], key: string) {
  window.localStorage.setItem(key, JSON.stringify(items));
  window.dispatchEvent(new Event("cart-updated"));
}

export function useCart() {
  const { data: session, status } = useSession();
  const userId = status === "authenticated" ? session?.user?.id : undefined;
  const key = activeKey(userId);

  const [items, setItems] = useState<CartItem[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    if (status === "loading") return;
    setItems(readCart(key));
    setIsHydrated(true);
  }, [key, status]);

  useEffect(() => {
    if (status === "loading") return;
    const syncCart = () => setItems(readCart(key));
    window.addEventListener("storage", syncCart);
    window.addEventListener("cart-updated", syncCart);
    return () => {
      window.removeEventListener("storage", syncCart);
      window.removeEventListener("cart-updated", syncCart);
    };
  }, [key, status]);

  const totalItems = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity, 0),
    [items],
  );

  const subtotal = useMemo(() => calculateCartTotal(items), [items]);

  const addItem = (product: ProductRecord, quantity: number, variant?: SelectedVariant) => {
    const normalizedQuantity = clampQuantity(quantity);
    const cartItemKey = buildCartKey(product._id, variant);
    const nextItems = [...items];
    const itemIndex = nextItems.findIndex((item) => item.cartKey === cartItemKey);

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
        cartKey: cartItemKey,
        selectedVariant: variant,
      });
    }

    setItems(nextItems);
    writeCart(nextItems, key);
  };

  const updateQuantity = (cartItemKey: string, quantity: number) => {
    const normalizedQuantity = clampQuantity(quantity);
    const nextItems = items.map((item) =>
      item.cartKey === cartItemKey ? { ...item, quantity: normalizedQuantity } : item,
    );
    setItems(nextItems);
    writeCart(nextItems, key);
  };

  const removeItem = (cartItemKey: string) => {
    const nextItems = items.filter((item) => item.cartKey !== cartItemKey);
    setItems(nextItems);
    writeCart(nextItems, key);
  };

  const clearCart = () => {
    setItems([]);
    writeCart([], key);
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
