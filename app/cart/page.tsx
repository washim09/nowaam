import { CartClient } from "@/components/CartClient";

export default function CartPage() {
  return (
    <div className="space-y-8 pb-8 pt-4">
      <section className="section-shell">
        <div className="page-hero">
          <span className="eyebrow">Cart</span>
          <h1 className="page-title">Review your order</h1>
          <p className="page-copy">
            Update quantities, unlock bulk pricing automatically, and move to checkout when the
            mix feels right.
          </p>
        </div>
      </section>

      <section className="section-shell">
        <CartClient />
      </section>
    </div>
  );
}
