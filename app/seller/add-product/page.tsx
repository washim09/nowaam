import type { Metadata } from "next";
import Link from "next/link";

import { buttonStyles } from "@/components/Button";
import { SellerProductForm } from "@/components/SellerProductForm";

export const metadata: Metadata = {
  title: "Add Product",
};

export default function SellerAddProductPage() {
  return (
    <div className="section-shell space-y-6 pb-16 pt-4">
      <Link
        href="/seller"
        className={buttonStyles({ variant: "secondary", size: "sm", className: "w-fit" })}
      >
        Back to dashboard
      </Link>
      <SellerProductForm />
    </div>
  );
}
