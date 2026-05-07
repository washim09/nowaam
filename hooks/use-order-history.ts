"use client";

import { useEffect, useState } from "react";

import { ORDER_HISTORY_STORAGE_KEY } from "@/lib/constants";
import type { OrderRecord } from "@/types";

function storageKey(userId: string): string {
  return `${ORDER_HISTORY_STORAGE_KEY}-${userId}`;
}

function readOrderIds(userId: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(storageKey(userId));
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function addOrderToHistory(orderId: string, userId: string) {
  if (typeof window === "undefined" || !userId) return;
  const existing = readOrderIds(userId);
  if (!existing.includes(orderId)) {
    const updated = [orderId, ...existing];
    window.localStorage.setItem(storageKey(userId), JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent("order-history-updated", { detail: { userId } }));
  }
}

export function useOrderHistory(userId?: string) {
  const [orderIds, setOrderIds] = useState<string[]>([]);
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    if (!userId) return;

    const sync = (e?: Event) => {
      const detail = (e as CustomEvent<{ userId: string }>)?.detail;
      if (detail && detail.userId !== userId) return;
      setOrderIds(readOrderIds(userId));
      setIsHydrated(true);
    };

    sync();
    window.addEventListener("order-history-updated", sync);
    return () => window.removeEventListener("order-history-updated", sync);
  }, [userId]);

  useEffect(() => {
    if (!isHydrated) return;

    if (orderIds.length === 0) {
      setOrders([]);
      return;
    }

    setIsLoading(true);

    Promise.all(
      orderIds.map((id) =>
        fetch(`/api/orders/${id}`)
          .then((res) => res.json())
          .then((data: { order?: OrderRecord }) => data.order ?? null)
          .catch(() => null),
      ),
    )
      .then((results) => setOrders(results.filter(Boolean) as OrderRecord[]))
      .finally(() => setIsLoading(false));
  }, [isHydrated, orderIds]);

  return { orders, isLoading, isHydrated };
}
