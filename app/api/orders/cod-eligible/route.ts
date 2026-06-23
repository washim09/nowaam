import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/auth";
import { connectToDatabase } from "@/lib/db";
import Product from "@/models/Product";
import SellerShippingPreferences from "@/models/SellerShippingPreferences";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Auth required." }, { status: 401 });
    }

    const body = (await request.json()) as {
      items?: Array<{ productId: string }>;
    };

    if (!body.items?.length) {
      return NextResponse.json({ eligible: false, reason: "Cart is empty." });
    }

    await connectToDatabase();

    const products = await Product.find({
      _id: { $in: body.items.map((i) => i.productId) },
    })
      .select("sellerId")
      .lean();

    const sellerIds = [
      ...new Set(products.map((p) => p.sellerId).filter(Boolean)),
    ] as string[];

    if (!sellerIds.length) {
      return NextResponse.json({
        eligible: false,
        reason: "No seller found for cart items.",
      });
    }

    const prefs = await SellerShippingPreferences.find({
      sellerId: { $in: sellerIds },
    })
      .select("sellerId codEnabled")
      .lean();

    const codMap = new Map(prefs.map((p) => [p.sellerId, p.codEnabled]));
    const disabledSellers = sellerIds.filter((id) => !codMap.get(id));

    if (disabledSellers.length > 0) {
      return NextResponse.json({
        eligible: false,
        reason: "One or more sellers do not offer Cash on Delivery.",
      });
    }

    return NextResponse.json({ eligible: true });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Check failed.",
      },
      { status: 500 },
    );
  }
}
