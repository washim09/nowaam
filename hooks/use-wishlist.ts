"use client";

import { useEffect, useState } from "react";

import { WISHLIST_STORAGE_KEY } from "@/lib/constants";

function readWishlist() {
  if (typeof window === "undefined") {
    return [] as string[];
  }

  try {
    const raw = window.localStorage.getItem(WISHLIST_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function writeWishlist(items: string[]) {
  window.localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(items));
  window.dispatchEvent(new Event("wishlist-updated"));
}

export function useWishlist() {
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    const syncWishlist = () => {
      setWishlist(readWishlist());
      setIsHydrated(true);
    };

    syncWishlist();
    window.addEventListener("storage", syncWishlist);
    window.addEventListener("wishlist-updated", syncWishlist);

    return () => {
      window.removeEventListener("storage", syncWishlist);
      window.removeEventListener("wishlist-updated", syncWishlist);
    };
  }, []);

  const has = (productId: string) => wishlist.includes(productId);

  const toggle = (productId: string) => {
    const nextWishlist = has(productId)
      ? wishlist.filter((item) => item !== productId)
      : [...wishlist, productId];

    setWishlist(nextWishlist);
    writeWishlist(nextWishlist);
  };

  return {
    wishlist,
    isHydrated,
    has,
    toggle,
  };
}
