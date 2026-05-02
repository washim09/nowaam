"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";

type ToastVariant = "success" | "error" | "info";

type Toast = {
  id: string;
  title: string;
  description?: string;
  variant: ToastVariant;
};

type ToastContextValue = {
  toast: (input: Omit<Toast, "id">) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const toastStyles: Record<ToastVariant, string> = {
  success: "border-emerald-100 bg-white/92 text-emerald-950",
  error: "border-rose-100 bg-white/92 text-rose-950",
  info: "border-brand-100 bg-white/92 text-brand-900",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = (input: Omit<Toast, "id">) => {
    const id =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

    setToasts((current) => [...current, { id, ...input }]);

    window.setTimeout(() => {
      setToasts((current) => current.filter((item) => item.id !== id));
    }, 3200);
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}

      <div className="pointer-events-none fixed inset-x-4 top-20 z-50 flex justify-end">
        <div className="flex w-full max-w-sm flex-col gap-3">
          {toasts.map((item) => (
            <div
              key={item.id}
              className={cn(
                "pointer-events-auto rounded-[24px] border px-4 py-3 shadow-md backdrop-blur-xl transition-all duration-300",
                toastStyles[item.variant],
              )}
            >
              <p className="text-sm font-semibold">{item.title}</p>
              {item.description ? (
                <p className="mt-1 text-sm opacity-75">{item.description}</p>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("useToast must be used inside ToastProvider.");
  }

  return context;
}
