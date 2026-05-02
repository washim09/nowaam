import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { connectToDatabase } from "@/lib/db";
import User from "@/models/User";

export const runtime = "nodejs";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }
    await connectToDatabase();
    const user = await User.findById(session.user.id).select("wishlist").lean();
    return NextResponse.json({ wishlist: (user as { wishlist?: string[] })?.wishlist ?? [] });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch wishlist." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }
    const { productId, action } = (await request.json()) as {
      productId?: string;
      action?: "add" | "remove";
    };
    if (!productId) {
      return NextResponse.json({ error: "productId is required." }, { status: 400 });
    }
    await connectToDatabase();
    const update =
      action === "remove"
        ? { $pull: { wishlist: productId } }
        : { $addToSet: { wishlist: productId } };
    await User.findByIdAndUpdate(session.user.id, update);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update wishlist." },
      { status: 500 },
    );
  }
}
