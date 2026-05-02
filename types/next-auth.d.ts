import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      role: "buyer" | "seller" | "admin";
    };
  }

  interface User {
    id?: string;
    role?: "buyer" | "seller" | "admin";
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: "buyer" | "seller" | "admin";
  }
}
