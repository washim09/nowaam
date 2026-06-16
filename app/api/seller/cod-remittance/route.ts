import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/auth";
import { connectToDatabase } from "@/lib/db";
import CodRemittance from "@/models/CodRemittance";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * List COD remittance records for the current seller.
 *
 * Returns aggregated totals (pending + paid) plus the full record list.
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
    const filter: Record<string, unknown> = {};
    if (session.user.role === "seller") {
      filter.sellerId = session.user.id;
    } else if (session.user.role === "admin") {
      const sellerId = searchParams.get("sellerId");
      if (sellerId) filter.sellerId = sellerId;
    }

    const remittances = await CodRemittance.find(filter)
      .sort({ remittanceDate: -1, createdAt: -1 })
      .limit(500)
      .lean();

    const totals = {
      pending: 0,
      processing: 0,
      paid: 0,
      onHold: 0,
      failed: 0,
    };
    for (const r of remittances) {
      const amt = r.amount ?? 0;
      if (r.remittanceStatus === "pending") totals.pending += amt;
      else if (r.remittanceStatus === "processing") totals.processing += amt;
      else if (r.remittanceStatus === "paid") totals.paid += amt;
      else if (r.remittanceStatus === "on_hold") totals.onHold += amt;
      else if (r.remittanceStatus === "failed") totals.failed += amt;
    }

    return NextResponse.json({
      remittances: JSON.parse(JSON.stringify(remittances)),
      totals,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load remittances." },
      { status: 500 },
    );
  }
}
