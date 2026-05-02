import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { AuthRegisterClient } from "@/components/AuthRegisterClient";
import { COMPANY_NAME } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Create Account",
};

export default function RegisterPage() {
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
            Create your account
          </h1>
          <p className="mt-2 text-sm text-stone-500">
            Join Nowaam to start shopping from manufacturers.
          </p>
        </div>

        <div className="surface-elevated p-6 sm:p-8">
          <Suspense fallback={null}>
            <AuthRegisterClient defaultRole="buyer" />
          </Suspense>
        </div>

        <p className="mt-5 text-center text-sm text-stone-500">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-semibold text-brand-700 hover:text-brand-900"
          >
            Sign in
          </Link>
        </p>
        <p className="mt-2 text-center text-xs text-stone-400">
          Want to sell?{" "}
          <Link
            href="/sell-on-nowaam"
            className="font-semibold text-brand-500 hover:text-brand-700"
          >
            Register as a seller
          </Link>
        </p>
      </div>
    </div>
  );
}
