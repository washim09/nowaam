"use client";

import { useState } from "react";

import { buttonStyles } from "@/components/Button";
import { useToast } from "@/components/ToastProvider";
import { LOCATIONS, PRODUCT_CATEGORIES } from "@/lib/constants";
import { getFriendlyErrorMessage } from "@/lib/utils";

const initialFormState = {
  name: "",
  description: "",
  category: PRODUCT_CATEGORIES[0],
  manufacturerName: "",
  price: "",
  bulkPrice: "",
  minBulkQty: "",
  image: "",
  location: LOCATIONS[0],
};

export function AdminProductForm() {
  const [formState, setFormState] = useState(initialFormState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleFieldChange = (field: keyof typeof initialFormState, value: string) => {
    setFormState((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const retailPrice = Number(formState.price);
    const bulkPrice = Number(formState.bulkPrice);
    const minBulkQty = Number(formState.minBulkQty);

    if (
      !formState.name.trim() ||
      !formState.description.trim() ||
      !formState.manufacturerName.trim() ||
      !formState.image.trim() ||
      !formState.location ||
      !formState.category
    ) {
      toast({
        variant: "error",
        title: "Missing details",
        description: "Please complete all fields before saving the product.",
      });
      return;
    }

    if (retailPrice <= 0 || bulkPrice <= 0 || minBulkQty <= 0) {
      toast({
        variant: "error",
        title: "Invalid numeric values",
        description: "Price, bulk price, and minimum bulk quantity must be greater than zero.",
      });
      return;
    }

    if (bulkPrice > retailPrice) {
      toast({
        variant: "error",
        title: "Bulk price looks too high",
        description: "Bulk pricing should usually be less than or equal to the retail price.",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/products", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formState,
          price: retailPrice,
          bulkPrice,
          minBulkQty,
        }),
      });

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error || "Unable to create product.");
      }

      setFormState(initialFormState);
      toast({
        variant: "success",
        title: "Product created",
        description: "The new marketplace listing is now stored in MongoDB.",
      });
    } catch (error) {
      toast({
        variant: "error",
        title: "Product could not be created",
        description: getFriendlyErrorMessage(error),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1.08fr_0.92fr]">
      <form onSubmit={handleSubmit} className="surface-elevated space-y-6 p-6 sm:p-8">
        <div>
          <span className="eyebrow">Admin form</span>
          <h2 className="mt-4 text-3xl font-semibold tracking-[-0.05em] text-brand-900 sm:text-4xl">
            Add a new product
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-500">
            Create manufacturer listings with category, location, retail pricing, and wholesale
            pricing so they appear immediately across the marketplace.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <label className="flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.22em] text-brand-500">
              Category
            </span>
            <select
              value={formState.category}
              onChange={(event) => handleFieldChange("category", event.target.value)}
              className="input-shell"
            >
              {PRODUCT_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.22em] text-brand-500">
              Manufacturer
            </span>
            <input
              value={formState.manufacturerName}
              onChange={(event) => handleFieldChange("manufacturerName", event.target.value)}
              className="input-shell"
              placeholder="Apex Manufacturing Co."
              required
            />
          </label>

          <label className="flex flex-col gap-2 sm:col-span-2">
            <span className="text-xs font-semibold uppercase tracking-[0.22em] text-brand-500">
              Product name
            </span>
            <input
              value={formState.name}
              onChange={(event) => handleFieldChange("name", event.target.value)}
              className="input-shell"
              placeholder="Wireless Earbuds Pro"
              required
            />
          </label>

          <label className="flex flex-col gap-2 sm:col-span-2">
            <span className="text-xs font-semibold uppercase tracking-[0.22em] text-brand-500">
              Description
            </span>
            <textarea
              value={formState.description}
              onChange={(event) => handleFieldChange("description", event.target.value)}
              className="input-shell min-h-36 resize-y"
              placeholder="Describe the product, build quality, use case, and buyer value."
              required
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.22em] text-brand-500">
              Retail price
            </span>
            <input
              type="number"
              min="1"
              value={formState.price}
              onChange={(event) => handleFieldChange("price", event.target.value)}
              className="input-shell"
              placeholder="1499"
              required
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.22em] text-brand-500">
              Bulk price
            </span>
            <input
              type="number"
              min="1"
              value={formState.bulkPrice}
              onChange={(event) => handleFieldChange("bulkPrice", event.target.value)}
              className="input-shell"
              placeholder="1199"
              required
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.22em] text-brand-500">
              Minimum bulk quantity
            </span>
            <input
              type="number"
              min="1"
              value={formState.minBulkQty}
              onChange={(event) => handleFieldChange("minBulkQty", event.target.value)}
              className="input-shell"
              placeholder="10"
              required
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.22em] text-brand-500">
              Location
            </span>
            <select
              value={formState.location}
              onChange={(event) => handleFieldChange("location", event.target.value)}
              className="input-shell"
            >
              {LOCATIONS.map((location) => (
                <option key={location} value={location}>
                  {location}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-2 sm:col-span-2">
            <span className="text-xs font-semibold uppercase tracking-[0.22em] text-brand-500">
              Image URL
            </span>
            <input
              type="url"
              value={formState.image}
              onChange={(event) => handleFieldChange("image", event.target.value)}
              className="input-shell"
              placeholder="https://images.unsplash.com/..."
              required
            />
          </label>
        </div>

        <button type="submit" disabled={isSubmitting} className={buttonStyles({ size: "lg" })}>
          {isSubmitting ? "Saving product..." : "Create product"}
        </button>
      </form>

      <aside className="space-y-4 lg:sticky lg:top-28 lg:h-fit">
        <div className="surface-dark p-6">
          <p className="text-[11px] uppercase tracking-[0.22em] text-white/60">Publishing guide</p>
          <h3 className="mt-4 text-3xl font-semibold tracking-[-0.05em]">
            Keep the marketplace structured
          </h3>
          <div className="mt-5 space-y-3 text-sm leading-6 text-white/72">
            <p>Use large, well-lit product images with enough negative space around the product.</p>
            <p>Keep retail pricing above bulk pricing so the quantity-driven discount reads clearly.</p>
            <p>Descriptions work best when they mention category, product specs, and target buyers.</p>
          </div>
        </div>

        <div className="surface-panel p-5">
          <p className="text-[11px] uppercase tracking-[0.22em] text-brand-500">Live preview</p>
          <div className="mt-4 overflow-hidden rounded-[24px] bg-brand-100">
            {formState.image ? (
              <img
                src={formState.image}
                alt={formState.name || "Product preview"}
                className="h-64 w-full object-cover"
              />
            ) : (
              <div className="grid h-64 place-items-center text-sm text-stone-500">
                Product image preview
              </div>
            )}
          </div>
          <div className="mt-4">
            <p className="text-lg font-semibold tracking-[-0.03em] text-brand-900">
              {formState.name || "Your new product"}
            </p>
            <p className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-brand-500">
              {formState.manufacturerName || "Manufacturer"} / {formState.category}
            </p>
            <p className="mt-2 text-sm leading-6 text-stone-500">
              {formState.description || "A short product description will appear here."}
            </p>
          </div>
        </div>
      </aside>
    </div>
  );
}
