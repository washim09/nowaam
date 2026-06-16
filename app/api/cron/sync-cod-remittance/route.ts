import { NextRequest, NextResponse } from "next/server";

import { connectToDatabase } from "@/lib/db";
import { logger, newRequestId } from "@/lib/logger";
import { ShippingService, type ProviderName } from "@/lib/shipping/ShippingService";
import CodRemittance from "@/models/CodRemittance";
import Shipment from "@/models/Shipment";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Sync COD remittance records from Shiprocket.
 * Runs weekly via vercel.json cron.
 *
 * Strategy:
 *   - Fetch the full COD remittance list from Shiprocket (~30 days)
 *   - For each remittance, match its AWBs to Shipment records → derive sellerId
 *   - Group amounts by seller and upsert per-seller CodRemittance docs
 *   - One Shiprocket remittance may produce multiple CodRemittance rows
 *     (one per seller whose AWBs were included)
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization") ?? "";
  const expected = process.env.CRON_SECRET;

  if (!expected) {
    return NextResponse.json(
      { error: "CRON_SECRET is not configured." },
      { status: 500 },
    );
  }
  if (authHeader !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const log = logger.child({ route: "cron/sync-cod-remittance", requestId: newRequestId() });
  const startedAt = Date.now();
  const stats = { fetched: 0, upserted: 0, skipped: 0, errors: 0, durationMs: 0 };

  try {
    await connectToDatabase();

    const providerName: ProviderName = "shiprocket";
    const provider = ShippingService.getProvider(providerName);
    if (typeof provider.fetchCodRemittances !== "function") {
      return NextResponse.json(
        { error: "Provider does not support COD remittance sync." },
        { status: 400 },
      );
    }

    const remittances = await provider.fetchCodRemittances();
    stats.fetched = remittances.length;

    for (const r of remittances) {
      try {
        if (!r.providerRemittanceId || r.awbList.length === 0) {
          stats.skipped += 1;
          continue;
        }

        // Match AWBs → sellers
        const shipments = await Shipment.find({ awbNumber: { $in: r.awbList } })
          .select("awbNumber sellerId orderId codAmount")
          .lean();

        if (shipments.length === 0) {
          stats.skipped += 1;
          continue;
        }

        // Group by seller
        const bySeller = new Map<
          string,
          { awbs: string[]; orderIds: string[]; amount: number }
        >();
        for (const s of shipments) {
          const sellerId = String(s.sellerId);
          if (!sellerId) continue;
          const entry = bySeller.get(sellerId) ?? { awbs: [], orderIds: [], amount: 0 };
          entry.awbs.push(s.awbNumber ?? "");
          entry.orderIds.push(String(s.orderId));
          entry.amount += s.codAmount ?? 0;
          bySeller.set(sellerId, entry);
        }

        // If no per-shipment COD amount data, fall back to proportional split
        const totalShipmentAmount = Array.from(bySeller.values()).reduce(
          (sum, e) => sum + e.amount,
          0,
        );
        const useProportional = totalShipmentAmount === 0 && r.amount > 0;

        for (const [sellerId, entry] of bySeller) {
          const sellerAmount = useProportional
            ? Math.round((r.amount * entry.awbs.length) / r.awbList.length)
            : entry.amount;

          await CodRemittance.findOneAndUpdate(
            { sellerId, providerRemittanceId: r.providerRemittanceId },
            {
              $set: {
                providerName,
                amount: sellerAmount,
                currency: r.currency,
                remittanceStatus: r.status,
                remittanceDate: r.remittanceDate,
                payoutDate: r.payoutDate,
                utr: r.utr,
                bankReference: r.bankReference,
                awbList: entry.awbs,
                orderIds: entry.orderIds,
                rawPayload: r.raw,
              },
            },
            { upsert: true, new: true },
          );
          stats.upserted += 1;
        }
      } catch (err) {
        stats.errors += 1;
        log.error("cod_sync.row_error", {
          remittanceId: r.providerRemittanceId,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    stats.durationMs = Date.now() - startedAt;
    log.info("cod_sync.completed", stats);

    return NextResponse.json({ success: true, stats });
  } catch (error) {
    stats.durationMs = Date.now() - startedAt;
    log.error("cod_sync.fatal", {
      error: error instanceof Error ? error.message : String(error),
      stats,
    });
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        stats,
      },
      { status: 500 },
    );
  }
}
