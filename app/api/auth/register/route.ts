import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";

import { connectToDatabase } from "@/lib/db";
import User from "@/models/User";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      name?: string;
      email?: string;
      password?: string;
      role?: string;
    };

    const { name, email, password, role } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: "Full name is required." }, { status: 400 });
    }

    if (!email?.trim()) {
      return NextResponse.json({ error: "Email address is required." }, { status: 400 });
    }

    if (!password || password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters." },
        { status: 400 },
      );
    }

    if (!role || !["buyer", "seller"].includes(role)) {
      return NextResponse.json({ error: "Please select a valid role." }, { status: 400 });
    }

    await connectToDatabase();

    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 },
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      role,
      isApproved: role === "buyer",
    });

    return NextResponse.json(
      {
        user: {
          id: String(user._id),
          name: user.name,
          email: user.email,
          role: user.role,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Registration failed." },
      { status: 500 },
    );
  }
}
