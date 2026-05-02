import type { Metadata } from "next";
import Link from "next/link";

import { ForgotPasswordClient } from "@/components/ForgotPasswordClient";
import { COMPANY_NAME } from "@/lib/constants";

export const metadata: Metadata = { title: "Forgot Password" };

export default function ForgotPasswordPage() {
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
            Forgot your password?
          </h1>
          <p className="mt-2 text-sm text-stone-500">
            Enter your email and we&apos;ll send you a reset link.
          </p>
        </div>
        <div className="surface-elevated p-6 sm:p-8">
          <ForgotPasswordClient />
        </div>
        <p className="mt-5 text-center text-sm text-stone-500">
          Remember it?{" "}
          <Link href="/login" className="font-semibold text-brand-700 hover:text-brand-900">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
