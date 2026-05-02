"use client";

import { useRef, useState } from "react";

import { buttonStyles } from "@/components/Button";
import { useToast } from "@/components/ToastProvider";
import { LOCATIONS, PRODUCT_CATEGORIES } from "@/lib/constants";
import { getFriendlyErrorMessage } from "@/lib/utils";
import type { ProductVariant } from "@/types";

const initialFormState = {
  name: "",
  description: "",
  category: PRODUCT_CATEGORIES[0],
  manufacturerName: "",
  price: "",
  bulkPrice: "",
  minBulkQty: "",
  stock: "",
  location: LOCATIONS[0],
};

export function SellerProductForm() {
  const [formState, setFormState] = useState(initialFormState);
  const [images, setImages] = useState<string[]>([]);
  const [urlInput, setUrlInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const addVariant = () => {
    setVariants((prev) => [...prev, { name: "", options: [{ label: "", priceModifier: 0, stock: null }] }]);
  };

  const removeVariant = (vi: number) => {
    setVariants((prev) => prev.filter((_, i) => i !== vi));
  };

  const updateVariantName = (vi: number, name: string) => {
    setVariants((prev) => prev.map((v, i) => (i === vi ? { ...v, name } : v)));
  };

  const addOption = (vi: number) => {
    setVariants((prev) =>
      prev.map((v, i) =>
        i === vi ? { ...v, options: [...v.options, { label: "", priceModifier: 0, stock: null }] } : v,
      ),
    );
  };

  const removeOption = (vi: number, oi: number) => {
    setVariants((prev) =>
      prev.map((v, i) =>
        i === vi ? { ...v, options: v.options.filter((_, j) => j !== oi) } : v,
      ),
    );
  };

  const updateOption = (
    vi: number,
    oi: number,
    field: "label" | "priceModifier" | "stock",
    value: string,
  ) => {
    setVariants((prev) =>
      prev.map((v, i) =>
        i === vi
          ? {
              ...v,
              options: v.options.map((opt, j) =>
                j === oi
                  ? {
                      ...opt,
                      [field]:
                        field === "label" ? value : value === "" ? null : Number(value),
                    }
                  : opt,
              ),
            }
          : v,
      ),
    );
  };

  const MAX_IMAGES = 5;

  const handleImageUpload = async (file: File) => {
    if (images.length >= MAX_IMAGES) {
      toast({ variant: "error", title: "Limit reached", description: `You can upload up to ${MAX_IMAGES} images.` });
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast({ variant: "error", title: "Invalid file", description: "Please select an image file." });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ variant: "error", title: "File too large", description: "Image must be smaller than 5 MB." });
      return;
    }
    setIsUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) throw new Error(data.error ?? "Upload failed.");
      setImages((prev) => [...prev, data.url!]);
      toast({ variant: "success", title: "Image uploaded", description: `Image ${images.length + 1} added.` });
    } catch (error) {
      toast({ variant: "error", title: "Upload failed", description: getFriendlyErrorMessage(error) });
    } finally {
      setIsUploading(false);
    }
  };

  const addImageUrl = () => {
    const trimmed = urlInput.trim();
    if (!trimmed) return;
    if (images.length >= MAX_IMAGES) {
      toast({ variant: "error", title: "Limit reached", description: `You can upload up to ${MAX_IMAGES} images.` });
      return;
    }
    setImages((prev) => [...prev, trimmed]);
    setUrlInput("");
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

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
      images.length === 0 ||
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
          image: images[0],
          images,
          price: retailPrice,
          bulkPrice,
          minBulkQty,
          stock: formState.stock ? Number(formState.stock) : null,
          variants: variants.filter((v) => v.name.trim() && v.options.some((o) => o.label.trim())),
        }),
      });

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error || "Unable to create product.");
      }

      setFormState(initialFormState);
      setImages([]);
      setUrlInput("");
      setVariants([]);
      toast({
        variant: "success",
        title: "Product listed",
        description: "Your new product is now live on the marketplace.",
      });
    } catch (error) {
      toast({
        variant: "error",
        title: "Product could not be listed",
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
          <span className="eyebrow">Seller form</span>
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
              Stock quantity
            </span>
            <input
              type="number"
              min="0"
              value={formState.stock}
              onChange={(event) => handleFieldChange("stock", event.target.value)}
              className="input-shell"
              placeholder="Leave blank for unlimited"
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

          <div className="flex flex-col gap-3 sm:col-span-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-[0.22em] text-brand-500">
                Product images
              </span>
              <span className="text-xs text-stone-400">{images.length}/{MAX_IMAGES} images</span>
            </div>

            {images.length > 0 && (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                {images.map((url, i) => (
                  <div key={i} className="group relative">
                    <img
                      src={url}
                      alt={`Image ${i + 1}`}
                      className="h-16 w-full rounded-[12px] object-cover shadow-sm"
                    />
                    {i === 0 && (
                      <span className="absolute bottom-1 left-1 rounded-full bg-brand-700 px-1.5 py-0.5 text-[9px] font-bold text-white">
                        Main
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => removeImage(i)}
                      className="absolute -right-1 -top-1 hidden h-5 w-5 items-center justify-center rounded-full bg-rose-600 text-xs font-bold text-white shadow group-hover:flex"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            {images.length < MAX_IMAGES && (
              <div
                className="flex flex-col items-center justify-center gap-3 rounded-[20px] border-2 border-dashed border-brand-200 bg-brand-50/50 p-6 text-center transition hover:bg-brand-50"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const file = e.dataTransfer.files[0];
                  if (file) void handleImageUpload(file);
                }}
              >
                <div className="grid h-14 w-14 place-items-center rounded-[14px] bg-brand-100 text-2xl text-brand-400">
                  ↑
                </div>
                <div>
                  <p className="text-sm font-semibold text-brand-700">
                    {isUploading ? "Uploading…" : "Drag & drop or click to upload"}
                  </p>
                  <p className="mt-0.5 text-xs text-stone-400">JPG, PNG, WebP — max 5 MB</p>
                </div>
                <button
                  type="button"
                  disabled={isUploading}
                  onClick={() => fileInputRef.current?.click()}
                  className={buttonStyles({ variant: "secondary", size: "sm" })}
                >
                  {isUploading ? "Uploading…" : "Choose file"}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void handleImageUpload(file);
                    e.target.value = "";
                  }}
                />
              </div>
            )}

            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addImageUrl(); } }}
                className="input-shell flex-1"
                placeholder="Or paste an image URL and press Enter"
                disabled={images.length >= MAX_IMAGES}
              />
              <button
                type="button"
                onClick={addImageUrl}
                disabled={!urlInput.trim() || images.length >= MAX_IMAGES}
                className={buttonStyles({ variant: "secondary", size: "sm" })}
              >
                Add
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-[0.22em] text-brand-500">
              Product variants (optional)
            </span>
            <button
              type="button"
              onClick={addVariant}
              className="rounded-full bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-100"
            >
              + Add variant
            </button>
          </div>

          {variants.map((variant, vi) => (
            <div key={vi} className="space-y-3 rounded-[20px] border border-brand-100 bg-brand-50/40 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <input
                  value={variant.name}
                  onChange={(e) => updateVariantName(vi, e.target.value)}
                  placeholder="Variant name (e.g. Size, Colour)"
                  className="input-shell flex-1 text-sm"
                />
                <button
                  type="button"
                  onClick={() => removeVariant(vi)}
                  className="rounded-full bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-100"
                >
                  Remove
                </button>
              </div>

              <div className="space-y-2">
                {variant.options.map((opt, oi) => (
                  <div key={oi} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_7rem_6rem_auto] sm:items-center">
                    <input
                      value={opt.label}
                      onChange={(e) => updateOption(vi, oi, "label", e.target.value)}
                      placeholder="Label (e.g. Large, Red)"
                      className="input-shell flex-1 text-sm"
                    />
                    <input
                      type="number"
                      value={opt.priceModifier === 0 ? "" : String(opt.priceModifier)}
                      onChange={(e) => updateOption(vi, oi, "priceModifier", e.target.value)}
                      placeholder="+₹ modifier"
                      className="input-shell w-28 text-sm"
                    />
                    <input
                      type="number"
                      min="0"
                      value={opt.stock === null || opt.stock === undefined ? "" : String(opt.stock)}
                      onChange={(e) => updateOption(vi, oi, "stock", e.target.value)}
                      placeholder="Stock"
                      className="input-shell w-24 text-sm"
                    />
                    {variant.options.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeOption(vi, oi)}
                        className="text-rose-400 hover:text-rose-600 text-lg leading-none px-1"
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => addOption(vi)}
                  className="text-xs font-semibold text-brand-600 hover:text-brand-800"
                >
                  + Add option
                </button>
              </div>
            </div>
          ))}
        </div>

        <button type="submit" disabled={isSubmitting} className={buttonStyles({ size: "lg" })}>
          {isSubmitting ? "Publishing product..." : "Publish product"}
        </button>
      </form>

      <aside className="space-y-4 lg:sticky lg:top-28 lg:h-fit">
        <div className="surface-dark p-6">
          <p className="text-[11px] uppercase tracking-[0.22em] text-white/60">Listing guide</p>
          <h3 className="mt-4 text-3xl font-semibold tracking-[-0.05em]">
            Set up your listing well
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
            {images[0] ? (
              <img
                src={images[0]}
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
