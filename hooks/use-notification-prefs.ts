"use client";

import { useEffect, useState } from "react";

import { NOTIFICATION_PREFS_STORAGE_KEY } from "@/lib/constants";

export type NotificationPrefs = {
  emailOrderConfirmation: boolean;
  emailStatusUpdates: boolean;
  emailPromos: boolean;
  smsOrderConfirmation: boolean;
  smsDeliveryUpdates: boolean;
  smsShippingAlerts: boolean;
};

const defaultPrefs: NotificationPrefs = {
  emailOrderConfirmation: true,
  emailStatusUpdates: true,
  emailPromos: false,
  smsOrderConfirmation: false,
  smsDeliveryUpdates: false,
  smsShippingAlerts: false,
};

function readPrefs(): NotificationPrefs {
  if (typeof window === "undefined") return defaultPrefs;
  try {
    const raw = window.localStorage.getItem(NOTIFICATION_PREFS_STORAGE_KEY);
    return raw
      ? { ...defaultPrefs, ...(JSON.parse(raw) as Partial<NotificationPrefs>) }
      : defaultPrefs;
  } catch {
    return defaultPrefs;
  }
}

export function useNotificationPrefs() {
  const [prefs, setPrefs] = useState<NotificationPrefs>(defaultPrefs);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setPrefs(readPrefs());
    setIsHydrated(true);
  }, []);

  const updatePref = (key: keyof NotificationPrefs, value: boolean) => {
    const updated = { ...prefs, [key]: value };
    setPrefs(updated);
    window.localStorage.setItem(NOTIFICATION_PREFS_STORAGE_KEY, JSON.stringify(updated));
  };

  return { prefs, isHydrated, updatePref };
}
