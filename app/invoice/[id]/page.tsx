import { notFound } from "next/navigation";
import mongoose from "mongoose";

import { connectToDatabase } from "@/lib/db";
import { formatCurrency } from "@/lib/utils";
import { COMPANY_NAME } from "@/lib/constants";
import Order from "@/models/Order";
import type { OrderRecord } from "@/types";
import { PrintButton } from "@/components/PrintButton";

export const dynamic = "force-dynamic";

async function getOrder(id: string): Promise<OrderRecord | null> {
  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  await connectToDatabase();
  const order = await Order.findById(id).lean();
  return order ? (JSON.parse(JSON.stringify(order)) as OrderRecord) : null;
}

export default async function InvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const order = await getOrder(id);

  if (!order || order.paymentStatus !== "paid") notFound();

  const orderDate = order.createdAt
    ? new Date(order.createdAt).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "—";

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
        }
      `}</style>

      <div className="min-h-screen bg-stone-50 py-8 print:bg-white print:py-0">
        <div className="mx-auto max-w-2xl px-4">
          <div className="no-print mb-6 flex items-center justify-between">
            <a
              href={`/account`}
              className="text-sm font-semibold text-brand-700 hover:underline"
            >
              ← Back to account
            </a>
            <PrintButton />
          </div>

          <div className="bg-white shadow-sm ring-1 ring-brand-100/60 rounded-[28px] p-8 sm:p-10 print:shadow-none print:ring-0 print:rounded-none">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-semibold tracking-[-0.04em] text-brand-900">
                  {COMPANY_NAME}
                </h1>
                <p className="mt-1 text-sm text-stone-500">Tax Invoice / Receipt</p>
              </div>
              <div className="text-right">
                <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
                  Paid
                </span>
              </div>
            </div>

            <div className="mt-8 grid gap-6 border-t border-stone-100 pt-6 sm:grid-cols-2">
              <div>
                <p className="text-[11px] uppercase tracking-[0.2em] text-stone-400">Invoice No.</p>
                <p className="mt-1 font-mono text-sm font-semibold text-brand-900">{order._id}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.2em] text-stone-400">Date</p>
                <p className="mt-1 text-sm font-semibold text-brand-900">{orderDate}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.2em] text-stone-400">Delivery location</p>
                <p className="mt-1 text-sm font-semibold text-brand-900">{order.userLocation}</p>
              </div>
              {order.razorpayPaymentId && (
                <div>
                  <p className="text-[11px] uppercase tracking-[0.2em] text-stone-400">Payment ID</p>
                  <p className="mt-1 font-mono text-sm font-semibold text-brand-900">{order.razorpayPaymentId}</p>
                </div>
              )}
            </div>

            <div className="mt-8">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-stone-100">
                    <th className="pb-3 text-left text-[11px] uppercase tracking-[0.2em] font-semibold text-stone-400">Item</th>
                    <th className="pb-3 text-right text-[11px] uppercase tracking-[0.2em] font-semibold text-stone-400">Qty</th>
                    <th className="pb-3 text-right text-[11px] uppercase tracking-[0.2em] font-semibold text-stone-400">Unit price</th>
                    <th className="pb-3 text-right text-[11px] uppercase tracking-[0.2em] font-semibold text-stone-400">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {order.items.map((item, i) => (
                    <tr key={i}>
                      <td className="py-4">
                        <p className="font-semibold text-brand-900">{item.name}</p>
                        <p className="text-xs text-stone-400">{item.location}</p>
                      </td>
                      <td className="py-4 text-right text-stone-500">{item.quantity}</td>
                      <td className="py-4 text-right text-stone-500">{formatCurrency(item.unitPrice)}</td>
                      <td className="py-4 text-right font-semibold text-brand-900">{formatCurrency(item.totalPrice)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-stone-200">
                    <td colSpan={3} className="pt-5 text-right text-sm font-semibold uppercase tracking-[0.14em] text-stone-500">
                      Total paid
                    </td>
                    <td className="pt-5 text-right text-2xl font-semibold tracking-[-0.04em] text-brand-900">
                      {formatCurrency(order.totalAmount)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="mt-8 rounded-[20px] bg-stone-50 p-5 text-center print:bg-transparent print:border print:border-stone-200">
              <p className="text-sm text-stone-500">
                Thank you for your purchase on{" "}
                <span className="font-semibold text-brand-900">{COMPANY_NAME}</span>.
              </p>
              <p className="mt-1 text-xs text-stone-400">
                This is a computer-generated invoice and does not require a signature.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
