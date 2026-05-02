import type { Metadata } from "next";

import { AdminRegisterClient } from "@/components/AdminRegisterClient";

export const metadata: Metadata = {
  title: "Admin Registration",
};

export default function AdminRegisterPage() {
  return <AdminRegisterClient />;
}
