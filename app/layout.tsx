import type { Metadata } from "next";
import type { ReactNode } from "react";

import { AuthSessionProvider } from "@/components/AuthSessionProvider";
import { Navbar } from "@/components/Navbar";
import { SiteFooter } from "@/components/SiteFooter";
import { ToastProvider } from "@/components/ToastProvider";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Nowaam Marketplace",
    template: "%s | Nowaam Marketplace",
  },
  description:
    "A multi-category marketplace MVP with retail and wholesale pricing, manufacturer listings, MongoDB persistence, and Razorpay payments.",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <AuthSessionProvider>
        <ToastProvider>
          <Navbar />
          <main className="pb-8">{children}</main>
          <SiteFooter />
        </ToastProvider>
        </AuthSessionProvider>
      </body>
    </html>
  );
}
