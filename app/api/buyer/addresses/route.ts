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
    const user = await User.findById(session.user.id).select("addresses").lean();
    return NextResponse.json({ addresses: (user as { addresses?: unknown[] })?.addresses ?? [] });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch addresses." },
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
    const body = (await request.json()) as {
      fullName?: string;
      phone?: string;
      addressLine?: string;
      area?: string;
      city?: string;
      pincode?: string;
    };
    if (!body.fullName?.trim() || !body.phone?.trim() || !body.addressLine?.trim() || !body.city?.trim()) {
      return NextResponse.json({ error: "Name, phone, address and city are required." }, { status: 400 });
    }
    await connectToDatabase();
    await User.findByIdAndUpdate(session.user.id, {
      $push: { addresses: { ...body } },
    });
    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save address." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }
    const { addressId } = (await request.json()) as { addressId?: string };
    if (!addressId) {
      return NextResponse.json({ error: "addressId is required." }, { status: 400 });
    }
    await connectToDatabase();
    await User.findByIdAndUpdate(session.user.id, {
      $pull: { addresses: { _id: addressId } },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete address." },
      { status: 500 },
    );
  }
}
