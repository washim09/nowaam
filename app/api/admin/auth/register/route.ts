import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

import { connectToDatabase } from "@/lib/db";
import User from "@/models/User";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      name?: string;
      email?: string;
      password?: string;
      inviteCode?: string;
    };

    const { name, email, password, inviteCode } = body;

    if (!name?.trim() || !email?.trim() || !password || !inviteCode) {
      return NextResponse.json(
        { error: "All fields including invite code are required." },
        { status: 400 },
      );
    }

    const expectedCode = process.env.ADMIN_INVITE_CODE;
    if (!expectedCode || inviteCode !== expectedCode) {
      return NextResponse.json(
        { error: "Invalid invite code. Please contact the platform owner." },
        { status: 403 },
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters." },
        { status: 400 },
      );
    }

    await connectToDatabase();

    const existing = await User.findOne({ email: email.trim().toLowerCase() });
    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 },
      );
    }

    const hashed = await bcrypt.hash(password, 12);

    await User.create({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password: hashed,
      role: "admin",
      isApproved: true,
    });

    return NextResponse.json(
      { message: "Admin account created successfully." },
      { status: 201 },
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Registration failed." },
      { status: 500 },
    );
  }
}
