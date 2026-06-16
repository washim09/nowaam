import { NextResponse } from "next/server";
import mongoose from "mongoose";

import { connectToDatabase } from "@/lib/db";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const startedAt = Date.now();
  let dbStatus: "connected" | "disconnected" = "disconnected";

  try {
    await connectToDatabase();
    dbStatus = mongoose.connection.readyState === 1 ? "connected" : "disconnected";
  } catch (err) {
    logger.error("health.db_check_failed", {
      error: err instanceof Error ? err.message : String(err),
    });
  }

  const ok = dbStatus === "connected";
  const body = {
    status: ok ? "ok" : "degraded",
    db: dbStatus,
    uptime: Math.round(process.uptime()),
    durationMs: Date.now() - startedAt,
    timestamp: new Date().toISOString(),
    version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "dev",
  };

  return NextResponse.json(body, { status: ok ? 200 : 503 });
}
