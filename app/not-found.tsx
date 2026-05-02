import Link from "next/link";

import { buttonStyles } from "@/components/Button";

export default function NotFound() {
  return (
    <div className="section-shell py-20">
      <div className="surface-elevated p-8 text-center sm:p-10">
        <span className="eyebrow">404 — Not found</span>
        <h1 className="mt-4 text-3xl font-semibold tracking-[-0.05em] text-brand-900 sm:text-4xl">
          Page not found
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-stone-500">
          The page you&apos;re looking for doesn&apos;t exist or may have been moved.
        </p>
        <Link href="/" className={buttonStyles({ size: "lg", className: "mt-6" })}>
          Back to home
        </Link>
      </div>
    </div>
  );
}
