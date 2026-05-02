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

function readProfile(): BuyerProfile {
  if (typeof window === "undefined") return defaultProfile;
  try {
    const raw = window.localStorage.getItem(PROFILE_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as BuyerProfile) : defaultProfile;
  } catch {
    return defaultProfile;
  }
}

export function useProfile() {
  const [profile, setProfile] = useState<BuyerProfile>(defaultProfile);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setProfile(readProfile());
    setIsHydrated(true);
  }, []);

  const saveProfile = (data: BuyerProfile) => {
    window.localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(data));
    setProfile(data);
  };

  return { profile, isHydrated, saveProfile };
}
