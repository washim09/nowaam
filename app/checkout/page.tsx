import { CheckoutClient } from "@/components/CheckoutClient";

export default function CheckoutPage() {
  return (
    <div className="space-y-8 pb-8 pt-4">
      <section className="section-shell">
        <div className="page-hero">
          <span className="eyebrow">Checkout</span>
          <h1 className="page-title">Secure payment flow</h1>
          <p className="page-copy">
            Razorpay order creation happens on the backend, then payment success is verified before
            the order is marked as paid.
          </p>
        </div>
      </section>

      <section className="section-shell">
        <CheckoutClient />
      </section>
    </div>
  );
}
