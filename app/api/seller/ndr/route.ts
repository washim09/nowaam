import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/auth";
import { connectToDatabase } from "@/lib/db";
import NDR from "@/models/NDR";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * List NDR cases for the current seller.
 * Admin can pass ?sellerId=... to view a specific seller's NDRs.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }
    if (!["seller", "admin"].includes(session.user.role ?? "")) {
      return NextResponse.json({ error: "Seller access required." }, { status: 403 });
    }

    await connectToDatabase();

    const { searchParams } = request.nextUrl;
    const status = searchParams.get("status");

    const filter: Record<string, unknown> = {};
    if (session.user.role === "seller") {
      filter.sellerId = session.user.id;
    } else if (session.user.role === "admin") {
      const sellerId = searchParams.get("sellerId");
      if (sellerId) filter.sellerId = sellerId;
    }
    if (status) filter.ndrStatus = status;

    const ndrs = await NDR.find(filter).sort({ createdAt: -1 }).limit(200).lean();

    return NextResponse.json({ ndrs: JSON.parse(JSON.stringify(ndrs)) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load NDRs." },
      { status: 500 },
    );
  }
}
