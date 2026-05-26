import { NextRequest, NextResponse } from "next/server";

import { connectToDatabase } from "@/lib/db";
import { applyTrackingResult, isTerminalStatus } from "@/lib/shipping/process-tracking-update";
import { ShippingService, type ProviderName } from "@/lib/shipping/ShippingService";
import Shipment from "@/models/Shipment";

export const runtime = "nodejs";
// Vercel allows up to 300s on Pro plan; we cap our work at ~25s to stay safe
export const maxDuration = 60;

const BATCH_SIZE = 100;
const SYNC_COOLDOWN_MS = 2 * 60 * 60 * 1000; // 2 hours
const MAX_AGE_MS = 90 * 24 * 60 * 60 * 1000; // 90 days
const HARD_TIME_BUDGET_MS = 25_000;

/**
 * Scheduled tracking sync — fallback for missed webhooks.
 *
 * Configured via vercel.json to run every 2 hours.
 * Authenticated via CRON_SECRET (Bearer token in Authorization header).
 *
 * Strategy:
 *   - Find non-terminal shipments with awbNumber + providerName
 *   - Skip those synced in the last 2 hours
 *   - Skip shipments older than 90 days (likely abandoned)
 *   - Cap to BATCH_SIZE per run; remainder picked up next run
 *   - Hard time budget ensures we exit cleanly before Vercel timeout
 */
export async function GET(request: NextRequest) {
  // ── Authentication ─────────────────────────────────────────────
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

  const startedAt = Date.now();
  const stats = {
    scanned: 0,
    skipped: 0,
    synced: 0,
    statusChanges: 0,
    errors: 0,
    durationMs: 0,
  };
  const errors: Array<{ shipmentId: string; awb?: string; error: string }> = [];

  try {
    await connectToDatabase();

    const cutoff = new Date(Date.now() - SYNC_COOLDOWN_MS);
    const oldestAllowed = new Date(Date.now() - MAX_AGE_MS);

    // ── Find candidates ─────────────────────────────────────────
    const candidates = await Shipment.find({
      shipmentStatus: { $nin: ["delivered", "returned_to_origin"] },
      awbNumber: { $exists: true, $ne: "" },
      providerName: { $in: ["shiprocket", "easypost"] },
      createdAt: { $gte: oldestAllowed },
      $or: [
        { lastSyncedAt: { $exists: false } },
        { lastSyncedAt: null },
        { lastSyncedAt: { $lt: cutoff } },
      ],
    })
      .sort({ lastSyncedAt: 1, createdAt: 1 }) // oldest-synced first
      .limit(BATCH_SIZE);

    stats.scanned = candidates.length;

    // ── Process each ─────────────────────────────────────────────
    for (const shipment of candidates) {
      // Hard time budget — exit cleanly so Vercel doesn't 504
      if (Date.now() - startedAt > HARD_TIME_BUDGET_MS) {
        console.warn(
          `[cron sync] Time budget exceeded; processed ${stats.synced}/${stats.scanned}`,
        );
        break;
      }

      if (!shipment.awbNumber || !shipment.providerName) {
        stats.skipped += 1;
        continue;
      }
      if (shipment.providerName === "manual" || shipment.providerName === "mock") {
        stats.skipped += 1;
        continue;
      }

      try {
        const provider = ShippingService.getProvider(
          shipment.providerName as ProviderName,
        );
        const result = await provider.trackShipment(shipment.awbNumber);

        const { statusChanged } = await applyTrackingResult(
          shipment,
          result,
          "cron",
        );

        stats.synced += 1;
        if (statusChanged) {
          stats.statusChanges += 1;
        }

        // If we just learned this shipment is delivered/RTO, no need to sync again
        if (isTerminalStatus(result.currentStatus)) {
          // applyTrackingResult already updated lastSyncedAt; nothing else to do
        }
      } catch (err) {
        stats.errors += 1;
        errors.push({
          shipmentId: String(shipment._id),
          awb: shipment.awbNumber,
          error: err instanceof Error ? err.message : "unknown error",
        });
        // Bump lastSyncedAt anyway to avoid retry storm on broken AWBs
        await Shipment.findByIdAndUpdate(shipment._id, {
          $set: { lastSyncedAt: new Date() },
        });
      }
    }

    stats.durationMs = Date.now() - startedAt;

    return NextResponse.json({
      success: true,
      stats,
      // Only include first 10 errors in response to avoid huge payloads
      errors: errors.slice(0, 10),
      hasMoreErrors: errors.length > 10,
    });
  } catch (error) {
    stats.durationMs = Date.now() - startedAt;
    console.error("[cron sync] fatal error:", error);
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
