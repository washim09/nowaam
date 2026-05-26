"use client";

import { useCallback, useEffect, useState } from "react";

import { buttonStyles } from "@/components/Button";
import { useToast } from "@/components/ToastProvider";
import { cn, getFriendlyErrorMessage } from "@/lib/utils";
import type {
  SellerPickupAddress,
  SellerShippingPreferencesRecord,
} from "@/types";

type FormState = {
  pickupAddress: SellerPickupAddress;
  packageDefaults: {
    weightGrams: string;
    lengthCm: string;
    widthCm: string;
    heightCm: string;
  };
  preferredProvider: "shiprocket" | "easypost" | "mock";
  autoCreateOnPayment: boolean;
  codEnabled: boolean;
};

const EMPTY_FORM: FormState = {
  pickupAddress: {
    contactPerson: "",
    email: "",
    phone: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    country: "India",
    pincode: "",
  },
  packageDefaults: {
    weightGrams: "500",
    lengthCm: "15",
    widthCm: "10",
    heightCm: "5",
  },
  preferredProvider: "shiprocket",
  autoCreateOnPayment: false,
  codEnabled: false,
};

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
  "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
  "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu",
  "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry",
];

export function SellerShippingSettings({
  onPreferencesLoaded,
}: {
  onPreferencesLoaded?: (prefs: SellerShippingPreferencesRecord | null) => void;
}) {
  const { toast } = useToast();
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [preferences, setPreferences] = useState<SellerShippingPreferencesRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const loadPreferences = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/seller/shipping-preferences", { cache: "no-store" });
      const data = (await res.json()) as {
        preferences?: SellerShippingPreferencesRecord | null;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error);

      setPreferences(data.preferences ?? null);
      onPreferencesLoaded?.(data.preferences ?? null);

      if (data.preferences) {
        setForm({
          pickupAddress: {
            ...EMPTY_FORM.pickupAddress,
            ...data.preferences.pickupAddress,
          },
          packageDefaults: {
            weightGrams: String(data.preferences.packageDefaults?.weightGrams ?? 500),
            lengthCm: String(data.preferences.packageDefaults?.lengthCm ?? 15),
            widthCm: String(data.preferences.packageDefaults?.widthCm ?? 10),
            heightCm: String(data.preferences.packageDefaults?.heightCm ?? 5),
          },
          preferredProvider: data.preferences.preferredProvider ?? "shiprocket",
          autoCreateOnPayment: data.preferences.autoCreateOnPayment ?? false,
          codEnabled: data.preferences.codEnabled ?? false,
        });
      } else {
        // Auto-expand setup form when no prefs exist
        setIsExpanded(true);
      }
    } catch (e) {
      toast({
        variant: "error",
        title: "Failed to load shipping settings",
        description: getFriendlyErrorMessage(e),
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast, onPreferencesLoaded]);

  useEffect(() => {
    void loadPreferences();
  }, [loadPreferences]);

  const updateAddress = <K extends keyof SellerPickupAddress>(
    field: K,
    value: SellerPickupAddress[K],
  ) => {
    setForm((f) => ({ ...f, pickupAddress: { ...f.pickupAddress, [field]: value } }));
  };

  const updateDefaults = (field: keyof FormState["packageDefaults"], value: string) => {
    setForm((f) => ({ ...f, packageDefaults: { ...f.packageDefaults, [field]: value } }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Client-side validation
    const a = form.pickupAddress;
    if (!a.contactPerson || !a.email || !a.phone || !a.addressLine1 || !a.city || !a.state) {
      toast({ variant: "error", title: "Missing required fields" });
      return;
    }
    if (!/^\d{6}$/.test(a.pincode)) {
      toast({ variant: "error", title: "Pincode must be 6 digits" });
      return;
    }
    if (a.phone.replace(/\D/g, "").length < 10) {
      toast({ variant: "error", title: "Phone must be at least 10 digits" });
      return;
    }
    if (!a.email.includes("@")) {
      toast({ variant: "error", title: "Invalid email address" });
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch("/api/seller/shipping-preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pickupAddress: form.pickupAddress,
          packageDefaults: {
            weightGrams: parseInt(form.packageDefaults.weightGrams, 10) || 500,
            lengthCm: parseFloat(form.packageDefaults.lengthCm) || 15,
            widthCm: parseFloat(form.packageDefaults.widthCm) || 10,
            heightCm: parseFloat(form.packageDefaults.heightCm) || 5,
          },
          preferredProvider: form.preferredProvider,
          autoCreateOnPayment: form.autoCreateOnPayment,
          codEnabled: form.codEnabled,
        }),
      });

      const data = (await res.json()) as {
        preferences?: SellerShippingPreferencesRecord;
        nickname?: string;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error);

      setPreferences(data.preferences ?? null);
      onPreferencesLoaded?.(data.preferences ?? null);
      toast({
        variant: "success",
        title: "Shipping settings saved",
        description: data.nickname
          ? `Registered with ${form.preferredProvider} as "${data.nickname}".`
          : "Your pickup address is ready for shipments.",
      });
      setIsExpanded(false);
    } catch (e) {
      toast({
        variant: "error",
        title: "Failed to save settings",
        description: getFriendlyErrorMessage(e),
      });
    } finally {
      setIsSaving(false);
    }
  };

  const isRegistered = preferences?.providerRegistrations?.some(
    (r) => r.provider === form.preferredProvider,
  );
  const registration = preferences?.providerRegistrations?.find(
    (r) => r.provider === (preferences.preferredProvider ?? "shiprocket"),
  );

  if (isLoading) {
    return (
      <div className="surface-elevated p-6">
        <div className="shimmer h-4 w-48 rounded-full bg-brand-100" />
      </div>
    );
  }

  // ───── Compact summary view (preferences exist & form collapsed) ─────
  if (preferences && !isExpanded) {
    return (
      <div className="surface-elevated overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-700">
                <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                Shipping configured
              </span>
              <span className="text-[11px] uppercase tracking-[0.18em] text-brand-500">
                {preferences.preferredProvider}
              </span>
              {registration?.nickname && (
                <span className="font-mono text-[10px] text-stone-500">
                  · {registration.nickname}
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-stone-600">
              Pickup from <strong>{preferences.pickupAddress.city}, {preferences.pickupAddress.state}</strong> —{" "}
              {preferences.pickupAddress.pincode}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsExpanded(true)}
            className={buttonStyles({ variant: "secondary", size: "sm" })}
          >
            Edit
          </button>
        </div>
      </div>
    );
  }

  // ───── Setup banner (no prefs yet) ─────
  return (
    <div className="surface-elevated overflow-hidden">
      <div className="border-b border-brand-100/60 bg-amber-50/40 px-6 py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold tracking-[-0.04em] text-brand-900">
              {preferences ? "Edit shipping settings" : "Set up your pickup address"}
            </h3>
            <p className="mt-1 text-sm text-stone-600">
              {preferences
                ? "Update your pickup address or package defaults."
                : "Required before you can create shipments. Your pickup address will be registered with the courier provider."}
            </p>
          </div>
          {preferences && (
            <button
              type="button"
              onClick={() => setIsExpanded(false)}
              className={buttonStyles({ variant: "secondary", size: "sm" })}
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 p-6">
        {/* Pickup address */}
        <fieldset className="space-y-4">
          <legend className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-500">
            Pickup Address
          </legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Contact Person *">
              <input
                type="text"
                required
                value={form.pickupAddress.contactPerson}
                onChange={(e) => updateAddress("contactPerson", e.target.value)}
                className={inputStyle}
                placeholder="e.g. Washim Akram"
              />
            </Field>
            <Field label="Phone *">
              <input
                type="tel"
                required
                value={form.pickupAddress.phone}
                onChange={(e) => updateAddress("phone", e.target.value)}
                className={inputStyle}
                placeholder="10-digit mobile"
              />
            </Field>
            <Field label="Email *">
              <input
                type="email"
                required
                value={form.pickupAddress.email}
                onChange={(e) => updateAddress("email", e.target.value)}
                className={inputStyle}
                placeholder="pickup@yourbusiness.com"
              />
            </Field>
            <Field label="Pincode *">
              <input
                type="text"
                required
                maxLength={6}
                pattern="\d{6}"
                value={form.pickupAddress.pincode}
                onChange={(e) =>
                  updateAddress("pincode", e.target.value.replace(/\D/g, ""))
                }
                className={inputStyle}
                placeholder="110001"
              />
            </Field>
            <Field label="Address Line 1 *" full>
              <input
                type="text"
                required
                value={form.pickupAddress.addressLine1}
                onChange={(e) => updateAddress("addressLine1", e.target.value)}
                className={inputStyle}
                placeholder="Building / street"
              />
            </Field>
            <Field label="Address Line 2" full>
              <input
                type="text"
                value={form.pickupAddress.addressLine2 ?? ""}
                onChange={(e) => updateAddress("addressLine2", e.target.value)}
                className={inputStyle}
                placeholder="Landmark / area (optional)"
              />
            </Field>
            <Field label="City *">
              <input
                type="text"
                required
                value={form.pickupAddress.city}
                onChange={(e) => updateAddress("city", e.target.value)}
                className={inputStyle}
              />
            </Field>
            <Field label="State *">
              <select
                required
                value={form.pickupAddress.state}
                onChange={(e) => updateAddress("state", e.target.value)}
                className={inputStyle}
              >
                <option value="">Select state…</option>
                {INDIAN_STATES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </fieldset>

        {/* Package defaults */}
        <fieldset className="space-y-4">
          <legend className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-500">
            Default Package Dimensions
          </legend>
          <p className="text-xs text-stone-500">
            Used to pre-fill new shipments. You can override per shipment.
          </p>
          <div className="grid gap-4 sm:grid-cols-4">
            <Field label="Weight (g)">
              <input
                type="number"
                min="1"
                value={form.packageDefaults.weightGrams}
                onChange={(e) => updateDefaults("weightGrams", e.target.value)}
                className={inputStyle}
              />
            </Field>
            <Field label="Length (cm)">
              <input
                type="number"
                min="1"
                step="0.1"
                value={form.packageDefaults.lengthCm}
                onChange={(e) => updateDefaults("lengthCm", e.target.value)}
                className={inputStyle}
              />
            </Field>
            <Field label="Width (cm)">
              <input
                type="number"
                min="1"
                step="0.1"
                value={form.packageDefaults.widthCm}
                onChange={(e) => updateDefaults("widthCm", e.target.value)}
                className={inputStyle}
              />
            </Field>
            <Field label="Height (cm)">
              <input
                type="number"
                min="1"
                step="0.1"
                value={form.packageDefaults.heightCm}
                onChange={(e) => updateDefaults("heightCm", e.target.value)}
                className={inputStyle}
              />
            </Field>
          </div>
        </fieldset>

        {/* Provider + toggles */}
        <fieldset className="space-y-4">
          <legend className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-500">
            Provider & Options
          </legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Preferred Courier Provider">
              <select
                value={form.preferredProvider}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    preferredProvider: e.target.value as FormState["preferredProvider"],
                  }))
                }
                className={inputStyle}
              >
                <option value="shiprocket">Shiprocket (recommended for India)</option>
                <option value="easypost">EasyPost (international)</option>
                <option value="mock">Mock (testing only)</option>
              </select>
            </Field>
            {isRegistered && (
              <div className="flex items-end">
                <p className="text-xs text-emerald-700">
                  ✓ Registered with {form.preferredProvider}
                </p>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <ToggleRow
              label="Auto-create shipment on payment success"
              description="Skip the manual 'create shipment' step. Requires verified KYC with provider."
              checked={form.autoCreateOnPayment}
              onChange={(checked) =>
                setForm((f) => ({ ...f, autoCreateOnPayment: checked }))
              }
            />
            <ToggleRow
              label="Accept Cash on Delivery (COD)"
              description="COD only for buyers with 2+ delivered prepaid orders and order value under ₹5,000."
              checked={form.codEnabled}
              onChange={(checked) => setForm((f) => ({ ...f, codEnabled: checked }))}
            />
          </div>
        </fieldset>

        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-brand-100/60 pt-4">
          <button
            type="submit"
            disabled={isSaving}
            className={buttonStyles({ size: "sm" })}
          >
            {isSaving
              ? "Saving…"
              : preferences
                ? "Save changes"
                : "Save & register pickup"}
          </button>
        </div>
      </form>
    </div>
  );
}

const inputStyle =
  "w-full rounded-lg border border-brand-100 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none";

function Field({
  label,
  children,
  full,
}: {
  label: string;
  children: React.ReactNode;
  full?: boolean;
}) {
  return (
    <label className={cn("flex flex-col gap-1.5", full && "sm:col-span-2")}>
      <span className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-500">
        {label}
      </span>
      {children}
    </label>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-3 rounded-lg border border-brand-100/60 bg-white/60 px-4 py-3 hover:bg-white">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-brand-900">{label}</p>
        <p className="mt-0.5 text-xs text-stone-500">{description}</p>
      </div>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 h-4 w-4 cursor-pointer accent-brand-700"
      />
    </label>
  );
}
