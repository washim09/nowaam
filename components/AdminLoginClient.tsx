"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { getSession, signIn, signOut } from "next-auth/react";
import { useState } from "react";

import { cn } from "@/lib/utils";

export function AdminLoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/super-admin";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const result = await signIn("credentials", {
        email: email.trim().toLowerCase(),
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Incorrect email or password. Please try again.");
        return;
      }

      const session = await getSession();

      if (session?.user?.role !== "admin") {
        await signOut({ redirect: false });
        setError("This account does not have admin access.");
        return;
      }

      router.push(callbackUrl.startsWith("/super-admin") ? callbackUrl : "/super-admin");
      router.refresh();
    } catch {
      setError("Sign in failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-gradient-to-br from-stone-950 via-brand-950 to-stone-900 px-4 py-16">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-600 shadow-lg">
            <svg className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold tracking-[-0.04em] text-white">
            Admin Portal
          </h1>
          <p className="mt-1.5 text-sm text-stone-400">
            Platform owner and team access only
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur">
          {error && (
            <div className="mb-5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
              {error}
            </div>
          )}

          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="admin@example.com"
                className={cn(
                  "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-stone-600",
                  "focus:border-rose-500/50 focus:outline-none focus:ring-2 focus:ring-rose-500/20",
                  "transition-all duration-200",
                )}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="••••••••"
                className={cn(
                  "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-stone-600",
                  "focus:border-rose-500/50 focus:outline-none focus:ring-2 focus:ring-rose-500/20",
                  "transition-all duration-200",
                )}
              />
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
              {isLoading ? "Signing in…" : "Sign in to Admin Portal"}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-stone-500">
            New team member?{" "}
            <Link
              href="/super-admin/register"
              className="font-semibold text-rose-400 hover:text-rose-300"
            >
              Register with invite code
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
