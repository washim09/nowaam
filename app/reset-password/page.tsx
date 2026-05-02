import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { ResetPasswordClient } from "@/components/ResetPasswordClient";
import { COMPANY_NAME } from "@/lib/constants";

export const metadata: Metadata = { title: "Reset Password" };

export default function ResetPasswordPage() {
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
            Set a new password
          </h1>
          <p className="mt-2 text-sm text-stone-500">
            Choose a strong password for your account.
          </p>
        </div>
        <div className="surface-elevated p-6 sm:p-8">
          <Suspense fallback={null}>
            <ResetPasswordClient />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
