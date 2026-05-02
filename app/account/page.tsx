import type { Metadata } from "next";

import { BuyerAccountClient } from "@/components/BuyerAccountClient";

export const metadata: Metadata = {
  title: "My Account",
};

export default function AccountPage() {
  return (
    <div className="section-shell space-y-8 pb-16 pt-4">
      <BuyerAccountClient />
    </div>
  );
}
