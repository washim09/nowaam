import Link from "next/link";
import { notFound } from "next/navigation";

import { buttonStyles } from "@/components/Button";
import { ProductDetailClient } from "@/components/ProductDetailClient";
import { getProductById } from "@/lib/product-service";

export const dynamic = "force-dynamic";

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = await getProductById(id);

  if (!product) {
    notFound();
  }

  return (
    <div className="section-shell space-y-6 py-6 pb-28 sm:py-8 sm:pb-10">
      <Link
        href="/products"
        className={buttonStyles({ variant: "secondary", size: "sm", className: "w-fit" })}
      >
        Back to catalog
      </Link>
      <ProductDetailClient product={product} />
    </div>
  );
}
