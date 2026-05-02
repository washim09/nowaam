import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { connectToDatabase } from "@/lib/db";
import User from "@/models/User";

export const runtime = "nodejs";

export async function GET() {
  try {
    const session = await auth();
    if (session?.user?.role !== "admin") {
      return NextResponse.json({ error: "Access denied." }, { status: 403 });
    }

    await connectToDatabase();

    const users = await User.find({}, { password: 0 }).sort({ createdAt: -1 }).lean();

    return NextResponse.json({ users: JSON.parse(JSON.stringify(users)) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to fetch users." },
      { status: 500 },
    );
  }
}
