import bcrypt from "bcryptjs";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

import { authConfig } from "./auth.config";
import { connectToDatabase } from "@/lib/db";
import User from "@/models/User";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        await connectToDatabase();

        const user = await User.findOne({
          email: String(credentials.email).toLowerCase(),
        }).lean();

        if (!user) return null;

        const isValid = await bcrypt.compare(
          String(credentials.password),
          String(user.password),
        );
        if (!isValid) return null;

        if (!user.isApproved) {
          throw new Error("PENDING_APPROVAL");
        }

        return {
          id: String(user._id),
          name: String(user.name),
          email: String(user.email),
          role: user.role as "buyer" | "seller" | "admin",
        };
      },
    }),
  ],
});
