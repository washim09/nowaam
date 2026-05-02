import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { connectToDatabase } from "@/lib/db";
import Order from "@/models/Order";
import Product from "@/models/Product";
import User from "@/models/User";

export const runtime = "nodejs";

export async function GET() {
  try {
    const session = await auth();
    if (session?.user?.role !== "admin") {
      return NextResponse.json({ error: "Access denied." }, { status: 403 });
    }

    await connectToDatabase();

    const [
      totalUsers,
      totalSellers,
      totalBuyers,
      pendingSellers,
      totalProducts,
      totalOrders,
      revenueAgg,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: "seller" }),
      User.countDocuments({ role: "buyer" }),
      User.countDocuments({ role: "seller", isApproved: false }),
      Product.countDocuments(),
      Order.countDocuments(),
      Order.aggregate([
        { $match: { paymentStatus: "paid" } },
        {
          $group: {
            _id: null,
            total: { $sum: "$totalAmount" },
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    return NextResponse.json({
      stats: {
        totalUsers,
        totalSellers,
        totalBuyers,
        pendingSellers,
        totalProducts,
        totalOrders,
        paidOrders: (revenueAgg[0]?.count as number | undefined) ?? 0,
        totalRevenue: (revenueAgg[0]?.total as number | undefined) ?? 0,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to fetch stats." },
      { status: 500 },
    );
  }
}
