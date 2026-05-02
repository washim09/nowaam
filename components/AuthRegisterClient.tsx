"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { useState } from "react";

import { buttonStyles } from "@/components/Button";
import { cn } from "@/lib/utils";

type Role = "buyer" | "seller";

type AuthRegisterClientProps = { defaultRole?: Role };

export function AuthRegisterClient({ defaultRole }: AuthRegisterClientProps = {}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const paramRole = searchParams.get("role") === "buyer" ? "buyer" : searchParams.get("role") === "seller" ? "seller" : null;
  const preselectedRole: Role = defaultRole ?? paramRole ?? "buyer";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>(preselectedRole);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), password, role }),
      });

      const data = (await res.json()) as { error?: string };

      if (!res.ok) {
        setError(data.error ?? "Registration failed.");
        return;
      }

      const result = await signIn("credentials", {
        email: email.trim().toLowerCase(),
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Account created but sign-in failed. Please sign in manually.");
        router.push("/auth/signin");
      } else {
        router.push(role === "seller" ? "/seller" : "/");
        router.refresh();
      }
    } catch {
      setError("Something went wrong. Please try again.");
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

      <div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-brand-500">
          I am a
        </p>
        <div className="grid grid-cols-2 gap-2">
          {(["seller", "buyer"] as Role[]).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRole(r)}
              className={cn(
                "rounded-[18px] border-2 px-4 py-3 text-sm font-semibold capitalize transition-all duration-300",
                role === r
                  ? "border-brand-700 bg-brand-700 text-white"
                  : "border-brand-100 bg-white text-brand-700 hover:border-brand-300",
              )}
            >
              {r === "seller" ? "Seller / Manufacturer" : "Buyer"}
            </button>
          ))}
        </div>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-500">
          Full name
        </span>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your full name"
          required
          autoComplete="name"
          className="input-shell"
        />
      </label>

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
        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-500">
          Password
        </span>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Min. 8 characters"
          required
          autoComplete="new-password"
          minLength={8}
          className="input-shell"
        />
      </label>

      <button
        type="submit"
        disabled={isLoading}
        className={cn(buttonStyles({ size: "lg" }), "w-full")}
      >
        {isLoading ? "Creating account…" : "Create account"}
      </button>

      <p className="text-center text-sm text-stone-500">
        Already have an account?{" "}
        <Link
          href="/auth/signin"
          className="font-semibold text-brand-700 hover:underline"
        >
          Sign in
        </Link>
      </p>
    </form>
  );
}
