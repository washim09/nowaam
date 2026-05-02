"use client";

import {
  AccessoriesIcon,
  BeautyIcon,
  ElectronicsIcon,
  EssentialsIcon,
  FashionIcon,
  HomeIcon,
  SparklesIcon,
} from "@/components/Icons";
import type { CatalogCategory } from "@/lib/catalog";
import { cn } from "@/lib/utils";

type CategoryItem = {
  label: CatalogCategory;
  icon: string;
  description: string;
};

type CategorySliderProps = {
  categories: readonly CategoryItem[];
  selectedCategory: CatalogCategory;
  onSelect: (value: CatalogCategory) => void;
};

function CategoryIcon({ icon, isActive }: { icon: string; isActive: boolean }) {
  const className = cn("h-5 w-5", isActive ? "text-white" : "text-brand-700");

  switch (icon) {
    case "fashion":
      return <FashionIcon className={className} />;
    case "electronics":
      return <ElectronicsIcon className={className} />;
    case "home":
      return <HomeIcon className={className} />;
    case "beauty":
      return <BeautyIcon className={className} />;
    case "accessories":
      return <AccessoriesIcon className={className} />;
    case "essentials":
      return <EssentialsIcon className={className} />;
    default:
      return <SparklesIcon className={className} />;
  }
}

export function CategorySlider({
  categories,
  selectedCategory,
  onSelect,
}: CategorySliderProps) {
  return (
    <div className="hide-scrollbar flex gap-3 overflow-x-auto pb-1">
      {categories.map((category) => {
        const isActive = category.label === selectedCategory;

        return (
          <button
            key={category.label}
            type="button"
            onClick={() => onSelect(category.label)}
            className={cn(
              "group min-w-[150px] rounded-[28px] border px-4 py-4 text-left transition-all duration-300 sm:min-w-[164px]",
              isActive
                ? "border-brand-600 bg-brand-700 text-white shadow-md"
                : "border-white/80 bg-white/72 text-brand-900 shadow-sm backdrop-blur hover:-translate-y-0.5 hover:bg-white",
            )}
          >
            <div
              className={cn(
                "mb-4 inline-flex h-10 w-10 items-center justify-center rounded-full border",
                isActive
                  ? "border-white/20 bg-white/10"
                  : "border-brand-100/80 bg-brand-50/80",
              )}
            >
              <CategoryIcon icon={category.icon} isActive={isActive} />
            </div>
            <p className="text-sm font-semibold">{category.label}</p>
            <p className={cn("mt-1 text-xs", isActive ? "text-white/68" : "text-stone-500")}>
              {category.description}
            </p>
          </button>
        );
      })}
    </div>
  );
}
