import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/auth";
import { connectToDatabase } from "@/lib/db";
import NotificationPreferences from "@/models/NotificationPreferences";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CATEGORIES = [
  "orderUpdates",
  "shipmentUpdates",
  "paymentUpdates",
  "returnUpdates",
  "deliveryAlerts",
  "marketing",
] as const;
const CHANNELS = ["inApp", "email", "sms", "whatsapp"] as const;

type Category = (typeof CATEGORIES)[number];
type Channel = (typeof CHANNELS)[number];

type ChannelToggle = Partial<Record<Channel, boolean>>;
type PrefsBody = Partial<Record<Category, ChannelToggle>> & {
  smsOptOut?: boolean;
  whatsappOptOut?: boolean;
  emailOptOut?: boolean;
};

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }
    await connectToDatabase();
    let prefs = await NotificationPreferences.findOne({ userId: session.user.id }).lean();
    if (!prefs) {
      // Auto-create with defaults
      const created = await NotificationPreferences.create({ userId: session.user.id });
      prefs = created.toObject();
    }
    return NextResponse.json({ preferences: JSON.parse(JSON.stringify(prefs)) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load preferences." },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }
    const body = (await request.json()) as PrefsBody;
    const update: Record<string, unknown> = {};

    for (const cat of CATEGORIES) {
      const toggle = body[cat];
      if (toggle && typeof toggle === "object") {
        for (const ch of CHANNELS) {
          if (typeof toggle[ch] === "boolean") {
            update[`${cat}.${ch}`] = toggle[ch];
          }
        }
      }
    }
    if (typeof body.smsOptOut === "boolean") update.smsOptOut = body.smsOptOut;
    if (typeof body.whatsappOptOut === "boolean") update.whatsappOptOut = body.whatsappOptOut;
    if (typeof body.emailOptOut === "boolean") update.emailOptOut = body.emailOptOut;

    await connectToDatabase();
    const updated = await NotificationPreferences.findOneAndUpdate(
      { userId: session.user.id },
      { $set: update },
      { upsert: true, new: true },
    ).lean();

    return NextResponse.json({ preferences: JSON.parse(JSON.stringify(updated)) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to update preferences." },
      { status: 500 },
    );
  }
}
