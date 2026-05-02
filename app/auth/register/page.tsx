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
            Join as a seller to list products, or as a buyer to start shopping.
          </p>
        </div>

        <div className="surface-elevated p-6 sm:p-8">
          <Suspense>
            <AuthRegisterClient />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
