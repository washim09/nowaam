import type { Metadata } from "next";
import { Suspense } from "react";

import { AdminLoginClient } from "@/components/AdminLoginClient";

export const metadata: Metadata = {
  title: "Admin Login",
};

export default function AdminLoginPage() {
  return (
    <Suspense>
      <AdminLoginClient />
    </Suspense>
  );
}
