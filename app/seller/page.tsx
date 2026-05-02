import type { Metadata } from "next";

import { SellerDashboardClient } from "@/components/SellerDashboardClient";

export const metadata: Metadata = {
  title: "Seller Dashboard",
};

export default function SellerPage() {
  return (
    <div className="section-shell space-y-8 pb-16 pt-4">
      <SellerDashboardClient />
    </div>
  );
}
