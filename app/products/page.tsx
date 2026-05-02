import { ProductCatalog } from "@/components/ProductCatalog";
import { connectToDatabase } from "@/lib/db";
import Product from "@/models/Product";
import type { ProductRecord } from "@/types";

export const dynamic = "force-dynamic";

const PAGE_LIMIT = 50;

export default async function ProductsPage() {
  await connectToDatabase();
  const [rawProducts, total] = await Promise.all([
    Product.find({ isActive: { $ne: false } })
      .sort({ createdAt: -1 })
      .limit(PAGE_LIMIT)
      .lean(),
    Product.countDocuments({ isActive: { $ne: false } }),
  ]);

  const products = JSON.parse(JSON.stringify(rawProducts)) as ProductRecord[];

  return (
    <div className="space-y-10 pb-8 pt-4">
      <section className="section-shell">
        <div className="page-hero">
          <span className="eyebrow">All products</span>
          <h1 className="page-title">Marketplace catalog</h1>
          <p className="page-copy">
            A clean, responsive marketplace wall with manufacturer discovery, category browsing,
            location filters, pricing controls, and premium card interactions.
          </p>
        </div>
      </section>

      <ProductCatalog
        products={products}
        total={total}
        pageLimit={PAGE_LIMIT}
        title="Multi-category shopping with a softer, more marketplace-native interface"
        description="Filter by location, sort by price, save favorites, and move naturally from discovery to manufacturer-backed product detail pages."
      />
    </div>
  );
}
