import type { Metadata } from "next";

import { NotificationPreferencesClient } from "@/components/NotificationPreferencesClient";

export const metadata: Metadata = {
  title: "Notification preferences",
};

export default function NotificationPreferencesPage() {
  return (
    <div className="section-shell space-y-8 pb-16 pt-4">
      <NotificationPreferencesClient />
    </div>
  );
}
