import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { AuthSignInClient } from "@/components/AuthSignInClient";
import { COMPANY_NAME } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Sign In",
};

export default function LoginPage() {
  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link
            href="/"
            className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-500 hover:text-brand-700"
          >
            {COMPANY_NAME}
          </Link>
          <h1 className="mt-4 text-3xl font-semibold tracking-[-0.05em] text-brand-900 sm:text-4xl">
            Welcome back
          </h1>
          <p className="mt-2 text-sm text-stone-500">
            Sign in to your account to continue shopping.
          </p>
        </div>

        <div className="surface-elevated p-6 sm:p-8">
          <Suspense fallback={null}>
            <AuthSignInClient />
          </Suspense>
        </div>

        <p className="mt-5 text-center text-sm text-stone-500">
          Don&apos;t have an account?{" "}
          <Link
            href="/register"
            className="font-semibold text-brand-700 hover:text-brand-900"
          >
            Create one
          </Link>
        </p>
        <p className="mt-2 text-center text-xs text-stone-400">
          Are you a seller?{" "}
          <Link
            href="/sell-on-nowaam"
            className="font-semibold text-brand-500 hover:text-brand-700"
          >
            Learn about selling on Nowaam
          </Link>
        </p>
      </div>
    </div>
  );
}
