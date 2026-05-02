import type { Metadata } from "next";

import { SuperAdminClient } from "@/components/SuperAdminClient";

export const metadata: Metadata = {
  title: "Super Admin",
};

export default function SuperAdminPage() {
  return (
    <div className="section-shell space-y-6 pb-16 pt-4">
      <SuperAdminClient />
    </div>
  );
}
