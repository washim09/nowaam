"use client";

import { useCallback, useEffect, useState } from "react";

import { RECENTLY_VIEWED_STORAGE_KEY } from "@/lib/constants";

const MAX_RECENTLY_VIEWED = 10;

function readRecentlyViewed(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(RECENTLY_VIEWED_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function addToRecentlyViewed(productId: string) {
  if (typeof window === "undefined") return;
  const existing = readRecentlyViewed().filter((id) => id !== productId);
  const updated = [productId, ...existing].slice(0, MAX_RECENTLY_VIEWED);
  window.localStorage.setItem(RECENTLY_VIEWED_STORAGE_KEY, JSON.stringify(updated));
}

export function useRecentlyViewed() {
  const [ids, setIds] = useState<string[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIds(readRecentlyViewed());
    setIsHydrated(true);
  }, []);

  const clear = useCallback(() => {
    window.localStorage.removeItem(RECENTLY_VIEWED_STORAGE_KEY);
    setIds([]);
  }, []);

  return { ids, isHydrated, clear };
}
