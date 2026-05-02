"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { getSession, signIn } from "next-auth/react";
import { useState } from "react";

import { buttonStyles } from "@/components/Button";
import { cn } from "@/lib/utils";

const ERROR_MESSAGES: Record<string, string> = {
  seller_only: "This account does not have seller access. Please register as a seller.",
  CredentialsSignin: "Incorrect email or password. Please try again.",
  pending_approval: "Your seller account is pending admin approval. You will be notified once approved.",
  default: "Sign in failed. Please try again.",
};

export function AuthSignInClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/seller";
  const errorParam = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(
    errorParam ? (ERROR_MESSAGES[errorParam] ?? ERROR_MESSAGES.default) : null,
  );

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
        setError(ERROR_MESSAGES[result.error] ?? ERROR_MESSAGES.default);
      } else {
        const session = await getSession();
        if (session?.user?.role === "admin") {
          router.push("/super-admin");
        } else if (session?.user?.role === "seller") {
          router.push(callbackUrl.startsWith("/super-admin") ? "/seller" : callbackUrl);
        } else {
          const safeBuyerUrl =
            callbackUrl && !callbackUrl.startsWith("/super-admin") && !callbackUrl.startsWith("/seller")
              ? callbackUrl
              : "/account";
          router.push(safeBuyerUrl);
        }
        router.refresh();
      }
    } catch {
      setError(ERROR_MESSAGES.default);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="rounded-[18px] bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-500">
          Email address
        </span>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          required
          autoComplete="email"
          className="input-shell"
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-500">
            Password
          </span>
          <Link href="/forgot-password" className="text-xs font-medium text-brand-500 hover:text-brand-700">
            Forgot password?
          </Link>
        </div>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          required
          autoComplete="current-password"
          className="input-shell"
        />
      </label>

      <button
        type="submit"
        disabled={isLoading}
        className={cn(buttonStyles({ size: "lg" }), "w-full")}
      >
        {isLoading ? "Signing in…" : "Sign in"}
      </button>

      <p className="text-center text-sm text-stone-500">
        Don&apos;t have an account?{" "}
        <Link
          href="/auth/register"
          className="font-semibold text-brand-700 hover:underline"
        >
          Create account
        </Link>
      </p>
    </form>
  );
}
