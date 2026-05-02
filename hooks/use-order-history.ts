"use client";

import { useEffect, useState } from "react";

import { ORDER_HISTORY_STORAGE_KEY } from "@/lib/constants";
import type { OrderRecord } from "@/types";

function readOrderIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(ORDER_HISTORY_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function addOrderToHistory(orderId: string) {
  if (typeof window === "undefined") return;
  const existing = readOrderIds();
  if (!existing.includes(orderId)) {
    const updated = [orderId, ...existing];
    window.localStorage.setItem(ORDER_HISTORY_STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event("order-history-updated"));
  }
}

export function useOrderHistory() {
  const [orderIds, setOrderIds] = useState<string[]>([]);
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    const sync = () => {
      setOrderIds(readOrderIds());
      setIsHydrated(true);
    };

    sync();
    window.addEventListener("order-history-updated", sync);
    return () => window.removeEventListener("order-history-updated", sync);
  }, []);

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
