"use client";

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-full bg-brand-700 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-brand-800"
    >
      Print / Save PDF
    </button>
  );
}
