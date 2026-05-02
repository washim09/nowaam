"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { cn } from "@/lib/utils";

export function AdminRegisterClient() {
  const router = useRouter();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    inviteCode: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const set = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (form.password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (!form.inviteCode.trim()) {
      setError("Invite code is required.");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/admin/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim().toLowerCase(),
          password: form.password,
          inviteCode: form.inviteCode.trim(),
        }),
      });

      const data = (await res.json()) as { error?: string; message?: string };

      if (!res.ok) {
        setError(data.error ?? "Registration failed.");
        return;
      }

      setSuccess(true);
      setTimeout(() => router.push("/super-admin/login"), 2000);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const inputClass = cn(
    "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-stone-600",
    "focus:border-rose-500/50 focus:outline-none focus:ring-2 focus:ring-rose-500/20",
    "transition-all duration-200",
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-gradient-to-br from-stone-950 via-brand-950 to-stone-900 px-4 py-16">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-600 shadow-lg">
            <svg className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold tracking-[-0.04em] text-white">
            Create Admin Account
          </h1>
          <p className="mt-1.5 text-sm text-stone-400">
            An invite code is required to register
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur">
          {success ? (
            <div className="py-4 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20">
                <svg className="h-6 w-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-emerald-400">Account created successfully!</p>
              <p className="mt-1 text-xs text-stone-500">Redirecting to login…</p>
            </div>
          ) : (
            <>
              {error && (
                <div className="mb-5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
                  {error}
                </div>
              )}

              <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={set("name")}
                    required
                    placeholder="Your name"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={set("email")}
                    required
                    placeholder="admin@example.com"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">
                    Password
                  </label>
                  <input
                    type="password"
                    value={form.password}
                    onChange={set("password")}
                    required
                    placeholder="Min 8 characters"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    value={form.confirmPassword}
                    onChange={set("confirmPassword")}
                    required
                    placeholder="Repeat your password"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">
                    Invite Code
                  </label>
                  <div className="relative">
                    <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center">
                      <svg className="h-4 w-4 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                      </svg>
                    </span>
                    <input
                      type="password"
                      value={form.inviteCode}
                      onChange={set("inviteCode")}
                      required
                      placeholder="Enter your invite code"
                      className={cn(inputClass, "pl-10")}
                    />
                  </div>
                  <p className="mt-1.5 text-[11px] text-stone-600">
                    Contact the platform owner to get your invite code.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className={cn(
                    "mt-2 w-full rounded-xl bg-rose-600 py-3 text-sm font-semibold text-white shadow-lg",
                    "hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-500/40",
                    "transition-all duration-200 disabled:opacity-60",
                  )}
                >
                  {isLoading ? "Creating account…" : "Create Admin Account"}
                </button>
              </form>

              <p className="mt-6 text-center text-xs text-stone-500">
                Already have an account?{" "}
                <Link
                  href="/super-admin/login"
                  className="font-semibold text-rose-400 hover:text-rose-300"
                >
                  Sign in
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
