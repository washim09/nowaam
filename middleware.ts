import NextAuth from "next-auth";
import { NextResponse } from "next/server";

import { authConfig } from "./auth.config";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const session = req.auth;
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/account") || pathname.startsWith("/checkout")) {
    if (!session) {
      const url = new URL("/login", req.url);
      url.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(url);
    }
    if (session.user.role === "admin") {
      return NextResponse.redirect(new URL("/super-admin", req.url));
    }
    if (session.user.role === "seller") {
      return NextResponse.redirect(new URL("/seller", req.url));
    }
  }

  if (pathname.startsWith("/seller")) {
    if (!session) {
      const url = new URL("/auth/signin", req.url);
      url.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(url);
    }
    if (session.user.role !== "seller" && session.user.role !== "admin") {
      const url = new URL("/auth/signin", req.url);
      url.searchParams.set("error", "seller_only");
      return NextResponse.redirect(url);
    }
  }

  if (
    pathname.startsWith("/super-admin/login") ||
    pathname.startsWith("/super-admin/register")
  ) {
    if (session?.user?.role === "admin") {
      return NextResponse.redirect(new URL("/super-admin", req.url));
    }
    return;
  }

  if (pathname.startsWith("/super-admin")) {
    if (!session) {
      const url = new URL("/super-admin/login", req.url);
      url.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(url);
    }
    if (session.user.role !== "admin") {
      return NextResponse.redirect(new URL("/", req.url));
    }
  }
});

export const config = {
  matcher: ["/account", "/account/:path*", "/checkout", "/seller/:path*", "/super-admin/:path*"],
};
