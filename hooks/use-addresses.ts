"use client";

import { useEffect, useState } from "react";

import { ADDRESSES_STORAGE_KEY } from "@/lib/constants";

export type SavedAddress = {
  id: string;
  label: string;
  fullName: string;
  phone: string;
  addressLine: string;
  area: string;
  city: string;
  pincode: string;
};

function readAddresses(): SavedAddress[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(ADDRESSES_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SavedAddress[]) : [];
  } catch {
    return [];
  }
}

function writeAddresses(addresses: SavedAddress[]) {
  window.localStorage.setItem(ADDRESSES_STORAGE_KEY, JSON.stringify(addresses));
}

export function useAddresses() {
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setAddresses(readAddresses());
    setIsHydrated(true);
  }, []);

  const addAddress = (address: Omit<SavedAddress, "id">) => {
    const newAddress: SavedAddress = {
      ...address,
      id:
        typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    };
    const updated = [...addresses, newAddress];
    setAddresses(updated);
    writeAddresses(updated);
  };

  const removeAddress = (id: string) => {
    const updated = addresses.filter((a) => a.id !== id);
    setAddresses(updated);
    writeAddresses(updated);
  };

  return { addresses, isHydrated, addAddress, removeAddress };
}
