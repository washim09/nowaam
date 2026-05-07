"use client";

import { useCallback, useEffect, useState } from "react";

import { RECENTLY_VIEWED_STORAGE_KEY } from "@/lib/constants";

const MAX_RECENTLY_VIEWED = 10;

function storageKey(userId?: string): string {
  return userId ? `${RECENTLY_VIEWED_STORAGE_KEY}-${userId}` : RECENTLY_VIEWED_STORAGE_KEY;
}

function readRecentlyViewed(userId?: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(storageKey(userId));
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function addToRecentlyViewed(productId: string, userId?: string) {
  if (typeof window === "undefined") return;
  const key = storageKey(userId);
  const existing = readRecentlyViewed(userId).filter((id) => id !== productId);
  const updated = [productId, ...existing].slice(0, MAX_RECENTLY_VIEWED);
  window.localStorage.setItem(key, JSON.stringify(updated));
}

export function useRecentlyViewed(userId?: string) {
  const [ids, setIds] = useState<string[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIds(readRecentlyViewed(userId));
    setIsHydrated(true);
  }, [userId]);

  const clear = useCallback(() => {
    window.localStorage.removeItem(storageKey(userId));
    setIds([]);
  }, [userId]);

  return { ids, isHydrated, clear };
}
