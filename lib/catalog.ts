import { PRODUCT_CATEGORIES } from "@/lib/constants";
import type { ProductRecord } from "@/types";

export const CATALOG_CATEGORIES = [
  {
    label: "All",
    icon: "sparkles",
    description: "Everything in the marketplace",
  },
  {
    label: "Fashion",
    icon: "fashion",
    description: "Apparel, bags, footwear, and wearables",
  },
  {
    label: "Electronics",
    icon: "electronics",
    description: "Devices, accessories, and gadgets",
  },
  {
    label: "Home & Living",
    icon: "home",
    description: "Decor, utility, and home upgrades",
  },
  {
    label: "Beauty",
    icon: "beauty",
    description: "Personal care and beauty essentials",
  },
  {
    label: "Accessories",
    icon: "accessories",
    description: "Everyday add-ons and small goods",
  },
  {
    label: "Essentials",
    icon: "essentials",
    description: "General marketplace picks",
  },
] as const;

export type CatalogCategory = (typeof CATALOG_CATEGORIES)[number]["label"];

export const SORT_OPTIONS = [
  { value: "featured", label: "Featured" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
  { value: "bulk-savings", label: "Best Bulk Savings" },
] as const;

export type SortOption = (typeof SORT_OPTIONS)[number]["value"];

function normalizeCategory(value?: string) {
  if (!value) {
    return null;
  }

  const matchingCategory = PRODUCT_CATEGORIES.find(
    (category) => category.toLowerCase() === value.trim().toLowerCase(),
  );

  return matchingCategory ?? null;
}

export function getProductCategory(
  product: Pick<ProductRecord, "name" | "description" | "category">,
): CatalogCategory {
  const explicitCategory = normalizeCategory(product.category);

  if (explicitCategory) {
    return explicitCategory;
  }

  const text = `${product.name} ${product.description}`.toLowerCase();

  if (
    text.includes("phone") ||
    text.includes("laptop") ||
    text.includes("speaker") ||
    text.includes("headphone") ||
    text.includes("watch") ||
    text.includes("charger") ||
    text.includes("cable")
  ) {
    return "Electronics";
  }

  if (
    text.includes("sofa") ||
    text.includes("kitchen") ||
    text.includes("bed") ||
    text.includes("decor") ||
    text.includes("lamp") ||
    text.includes("storage") ||
    text.includes("home")
  ) {
    return "Home & Living";
  }

  if (
    text.includes("beauty") ||
    text.includes("skincare") ||
    text.includes("cosmetic") ||
    text.includes("makeup") ||
    text.includes("serum") ||
    text.includes("shampoo")
  ) {
    return "Beauty";
  }

  if (
    text.includes("bag") ||
    text.includes("wallet") ||
    text.includes("belt") ||
    text.includes("jewelry") ||
    text.includes("accessory") ||
    text.includes("card holder")
  ) {
    return "Accessories";
  }

  if (
    text.includes("shirt") ||
    text.includes("dress") ||
    text.includes("shoe") ||
    text.includes("sneaker") ||
    text.includes("fashion") ||
    text.includes("hoodie") ||
    text.includes("kurta")
  ) {
    return "Fashion";
  }

  return "Essentials";
}

export function getManufacturerName(product: Pick<ProductRecord, "manufacturerName">) {
  return product.manufacturerName?.trim() || "Independent Manufacturer";
}

export function getBulkSavings(product: Pick<ProductRecord, "price" | "bulkPrice">) {
  return Math.max(product.price - product.bulkPrice, 0);
}
