import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Sell on Nowaam",
  description:
    "Join Nowaam Marketplace as a seller. Reach bulk buyers, list manufacturer products, and grow your business.",
};

const BENEFITS = [
  {
    icon: "🏭",
    title: "Manufacturer-focused",
    description:
      "Built specifically for manufacturers and bulk suppliers. List both retail and wholesale pricing on every product.",
  },
  {
    icon: "📦",
    title: "Easy product listing",
    description:
      "Add products with images, descriptions, categories, and bulk pricing in minutes from your seller dashboard.",
  },
  {
    icon: "📊",
    title: "Sales analytics",
    description:
      "Track your revenue, monitor order statuses, and identify your top-performing products in real time.",
  },
  {
    icon: "🚚",
    title: "Order management",
    description:
      "Manage every incoming order from a single inbox. Update fulfillment status and handle buyer requests easily.",
  },
  {
    icon: "🌍",
    title: "Location-based reach",
    description:
      "Tag products with your location so nearby buyers can discover your inventory first.",
  },
  {
    icon: "💳",
    title: "Razorpay payments",
    description:
      "Get paid securely through Razorpay with full payment verification — no payment risk on your end.",
  },
];

const STEPS = [
  {
    step: "01",
    title: "Create your seller account",
    description:
      "Register on Nowaam with your business details. Our team reviews and approves seller applications.",
  },
  {
    step: "02",
    title: "List your products",
    description:
      "Add products with photos, pricing, bulk tiers, and location from your dedicated seller dashboard.",
  },
  {
    step: "03",
    title: "Receive & fulfill orders",
    description:
      "Buyers place orders, you get notified, mark items as shipped or delivered — it's that simple.",
  },
];

export default function SellOnNowaamPage() {
  return (
    <div className="space-y-0">
      <section className="section-shell py-16 sm:py-24">
        <div className="mx-auto max-w-3xl text-center">
          <span className="eyebrow">Seller Programme</span>
          <h1 className="mt-4 text-4xl font-semibold tracking-[-0.06em] text-brand-900 sm:text-5xl lg:text-6xl">
            Grow your business<br className="hidden sm:block" /> on Nowaam
          </h1>
          <p className="mt-5 text-base leading-7 text-stone-500 sm:text-lg">
            Join thousands of manufacturers and bulk suppliers who list their products on Nowaam.
            Reach verified buyers, manage orders, and scale — all from one dashboard.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/auth/register?role=seller"
              className="rounded-2xl bg-brand-700 px-7 py-3.5 text-sm font-semibold text-white shadow-md transition-all duration-200 hover:bg-brand-800 hover:shadow-lg"
            >
              Start selling today
            </Link>
            <Link
              href="/auth/signin?callbackUrl=/seller"
              className="rounded-2xl border border-brand-200 bg-white px-7 py-3.5 text-sm font-semibold text-brand-700 transition-all duration-200 hover:border-brand-300 hover:bg-brand-50"
            >
              Already a seller? Sign in
            </Link>
          </div>
        </div>
      </section>

      <section className="section-shell pb-16">
        <div className="surface-elevated p-6 sm:p-8 lg:p-12">
          <div className="mb-10 text-center">
            <span className="eyebrow">Why Nowaam</span>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-brand-900">
              Everything you need to sell
            </h2>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {BENEFITS.map((b) => (
              <div
                key={b.title}
                className="rounded-2xl border border-brand-50 bg-brand-50/40 p-6 transition-all duration-200 hover:bg-brand-50/80"
              >
                <div className="mb-3 text-3xl">{b.icon}</div>
                <h3 className="mb-2 text-base font-semibold text-brand-900">{b.title}</h3>
                <p className="text-sm leading-6 text-stone-500">{b.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section-shell pb-16">
        <div className="mb-10 text-center">
          <span className="eyebrow">How it works</span>
          <h2 className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-brand-900">
            Get started in 3 steps
          </h2>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {STEPS.map((s, i) => (
            <div key={s.step} className="relative flex flex-col items-start">
              {i < STEPS.length - 1 && (
                <div className="absolute left-[calc(50%+2rem)] top-5 hidden h-px w-full bg-brand-100 sm:block" />
              )}
              <div className="surface-elevated w-full space-y-3 p-6">
                <span className="text-4xl font-semibold tracking-[-0.06em] text-brand-200">
                  {s.step}
                </span>
                <h3 className="text-base font-semibold text-brand-900">{s.title}</h3>
                <p className="text-sm leading-6 text-stone-500">{s.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="section-shell pb-20">
        <div className="surface-elevated overflow-hidden p-8 text-center sm:p-12 lg:p-16">
          <div className="mx-auto max-w-xl">
            <h2 className="text-3xl font-semibold tracking-[-0.05em] text-brand-900">
              Ready to start selling?
            </h2>
            <p className="mt-3 text-sm leading-6 text-stone-500">
              Register your seller account today. Our team reviews applications and approves
              qualified manufacturers and suppliers.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link
                href="/auth/register?role=seller"
                className="rounded-2xl bg-brand-700 px-8 py-4 text-sm font-semibold text-white shadow-md transition-all duration-200 hover:bg-brand-800 hover:shadow-lg"
              >
                Create seller account
              </Link>
            </div>
            <p className="mt-5 text-xs text-stone-400">
              By registering, you agree to our seller policies. Accounts are reviewed before activation.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
