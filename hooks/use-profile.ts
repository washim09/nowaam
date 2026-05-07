"use client";

import { useEffect, useState } from "react";

import { PROFILE_STORAGE_KEY } from "@/lib/constants";

export type BuyerProfile = {
  fullName: string;
  email: string;
  phone: string;
  preferredCity: string;
};

const defaultProfile: BuyerProfile = {
  fullName: "",
  email: "",
  phone: "",
  preferredCity: "",
};

function storageKey(userId: string): string {
  return `${PROFILE_STORAGE_KEY}-${userId}`;
}

function readProfile(userId: string): BuyerProfile {
  if (typeof window === "undefined") return defaultProfile;
  try {
    const raw = window.localStorage.getItem(storageKey(userId));
    return raw ? (JSON.parse(raw) as BuyerProfile) : defaultProfile;
  } catch {
    return defaultProfile;
  }
}

export function useProfile(userId?: string) {
  const [profile, setProfile] = useState<BuyerProfile>(defaultProfile);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    if (!userId) return;
    setProfile(readProfile(userId));
    setIsHydrated(true);
  }, [userId]);

  const saveProfile = (data: BuyerProfile) => {
    if (!userId) return;
    window.localStorage.setItem(storageKey(userId), JSON.stringify(data));
    setProfile(data);
  };

  return { profile, isHydrated, saveProfile };
}
