"use client";

import { clampQuantity } from "@/lib/utils";

type QuantitySelectorProps = {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  label?: string;
};

export function QuantitySelector({
  value,
  onChange,
  min = 1,
  label = "Quantity",
}: QuantitySelectorProps) {
  const decrement = () => onChange(Math.max(min, value - 1));
  const increment = () => onChange(value + 1);

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand-500">{label}</p>
      <div className="inline-flex items-center rounded-full border border-white/80 bg-white/80 p-1 shadow-sm backdrop-blur">
        <button
          type="button"
          onClick={decrement}
          className="grid h-10 w-10 place-items-center rounded-full text-xl font-semibold text-brand-700 transition-all duration-300 hover:bg-brand-50"
          aria-label="Decrease quantity"
        >
          -
        </button>

        <input
          type="number"
          min={min}
          value={value}
          onChange={(event) => onChange(Math.max(min, clampQuantity(Number(event.target.value))))}
          className="w-14 border-0 bg-transparent text-center text-base font-semibold text-brand-900 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />

        <button
          type="button"
          onClick={increment}
          className="grid h-10 w-10 place-items-center rounded-full text-xl font-semibold text-brand-700 transition-all duration-300 hover:bg-brand-50"
          aria-label="Increase quantity"
        >
          +
        </button>
      </div>
    </div>
  );
}
