"use client";

type LocationFilterProps = {
  value: string;
  onChange: (value: string) => void;
  options: readonly string[];
  label?: string;
};

export function LocationFilter({
  value,
  onChange,
  options,
  label = "Filter by location",
}: LocationFilterProps) {
  return (
    <label className="flex w-full flex-col gap-2">
      <span className="text-xs font-semibold uppercase tracking-[0.22em] text-brand-500">
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="input-shell"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}
