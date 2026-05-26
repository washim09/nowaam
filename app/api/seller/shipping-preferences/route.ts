import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/auth";
import { connectToDatabase } from "@/lib/db";
import { ShippingService } from "@/lib/shipping/ShippingService";
import SellerShippingPreferences from "@/models/SellerShippingPreferences";

export const runtime = "nodejs";

type UpsertBody = {
  pickupAddress: {
    contactPerson: string;
    email: string;
    phone: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    country?: string;
    pincode: string;
  };
  packageDefaults?: {
    weightGrams?: number;
    lengthCm?: number;
    widthCm?: number;
    heightCm?: number;
  };
  preferredProvider?: "shiprocket" | "easypost" | "mock";
  autoCreateOnPayment?: boolean;
  codEnabled?: boolean;
};

function validateBody(body: UpsertBody): string | null {
  const a = body.pickupAddress;
  if (!a) return "pickupAddress is required.";
  if (!a.contactPerson) return "Contact person is required.";
  if (!a.email || !a.email.includes("@")) return "Valid email is required.";
  if (!a.phone || a.phone.replace(/\D/g, "").length < 10)
    return "Valid 10-digit phone is required.";
  if (!a.addressLine1) return "Address line 1 is required.";
  if (!a.city || !a.state) return "City and state are required.";
  if (!/^\d{6}$/.test(a.pincode)) return "Pincode must be 6 digits.";
  return null;
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "seller") {
      return NextResponse.json({ error: "Seller access required." }, { status: 403 });
    }

    await connectToDatabase();
    const prefs = await SellerShippingPreferences.findOne({
      sellerId: session.user.id,
    }).lean();

    return NextResponse.json({ preferences: prefs ? JSON.parse(JSON.stringify(prefs)) : null });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load preferences." },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "seller") {
      return NextResponse.json({ error: "Seller access required." }, { status: 403 });
    }

    const body = (await request.json()) as UpsertBody;
    const validationError = validateBody(body);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    await connectToDatabase();
    const sellerId = session.user.id;
    const provider = body.preferredProvider ?? "shiprocket";
    // Nickname must be unique per Shiprocket account; use short seller id
    const nickname = `nowaam-${sellerId.slice(-8)}`;

    // Register pickup location with the provider (idempotent on their side
    // for the same nickname, but we also track success in our DB)
    let registeredNickname = nickname;
    const existing = await SellerShippingPreferences.findOne({ sellerId });
    const alreadyRegistered = existing?.providerRegistrations?.some(
      (r) => r.provider === provider,
    );

    if (!alreadyRegistered) {
      const shippingProvider = ShippingService.getProvider(provider);
      if (shippingProvider.registerPickupLocation) {
        try {
          const result = await shippingProvider.registerPickupLocation({
            nickname,
            contactPerson: body.pickupAddress.contactPerson,
            email: body.pickupAddress.email,
            phone: body.pickupAddress.phone,
            addressLine1: body.pickupAddress.addressLine1,
            addressLine2: body.pickupAddress.addressLine2,
            city: body.pickupAddress.city,
            state: body.pickupAddress.state,
            country: body.pickupAddress.country ?? "India",
            pincode: body.pickupAddress.pincode,
          });
          registeredNickname = result.nickname;
        } catch (err) {
          return NextResponse.json(
            {
              error: `Failed to register pickup with ${provider}: ${
                err instanceof Error ? err.message : "unknown error"
              }`,
            },
            { status: 502 },
          );
        }
      }
    } else {
      const reg = existing?.providerRegistrations?.find((r) => r.provider === provider);
      registeredNickname = reg?.nickname ?? nickname;
    }

    const updated = await SellerShippingPreferences.findOneAndUpdate(
      { sellerId },
      {
        $set: {
          pickupAddress: {
            ...body.pickupAddress,
            country: body.pickupAddress.country ?? "India",
          },
          packageDefaults: body.packageDefaults ?? undefined,
          preferredProvider: provider,
          autoCreateOnPayment: body.autoCreateOnPayment ?? false,
          codEnabled: body.codEnabled ?? false,
        },
        $addToSet: {
          providerRegistrations: {
            provider,
            nickname: registeredNickname,
            registeredAt: new Date(),
          },
        },
      },
      { upsert: true, new: true },
    ).lean();

    return NextResponse.json({
      preferences: JSON.parse(JSON.stringify(updated)),
      nickname: registeredNickname,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save preferences." },
      { status: 500 },
    );
  }
}
