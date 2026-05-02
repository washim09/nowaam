import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/auth";
import { LOCATIONS, PRODUCT_CATEGORIES } from "@/lib/constants";
import { connectToDatabase } from "@/lib/db";
import Product from "@/models/Product";

export const runtime = "nodejs";

type VariantOption = { label: string; priceModifier?: number; stock?: number | null };
type Variant = { name: string; options: VariantOption[] };

type ProductPayload = {
  name: string;
  description: string;
  category: string;
  manufacturerName: string;
  price: number;
  bulkPrice: number;
  minBulkQty: number;
  image?: string;
  images?: string[];
  location: string;
  stock?: number | null;
  isActive?: boolean;
  variants?: Variant[];
};

function validateProductPayload(payload: Partial<ProductPayload>) {
  const locationOptions = new Set<string>(LOCATIONS);
  const categoryOptions = new Set<string>(PRODUCT_CATEGORIES);
  const retailPrice = Number(payload.price);
  const wholesalePrice = Number(payload.bulkPrice);
  const minimumBulkQuantity = Number(payload.minBulkQty);

  if (!payload.name?.trim()) {
    return { error: "Product name is required." };
  }

  if (!payload.description?.trim()) {
    return { error: "Product description is required." };
  }

  if (!payload.category?.trim() || !categoryOptions.has(payload.category)) {
    return { error: "Please select a valid product category." };
  }

  if (!payload.manufacturerName?.trim()) {
    return { error: "Manufacturer name is required." };
  }

  const primaryImage = payload.images?.[0]?.trim() || payload.image?.trim();
  if (!primaryImage) {
    return { error: "At least one product image is required." };
  }

  if (!payload.location?.trim() || !locationOptions.has(payload.location)) {
    return { error: "Please select a valid location." };
  }

  if (!Number.isFinite(retailPrice) || retailPrice <= 0) {
    return { error: "Retail price must be greater than zero." };
  }

  if (!Number.isFinite(wholesalePrice) || wholesalePrice <= 0) {
    return { error: "Bulk price must be greater than zero." };
  }

  if (wholesalePrice > retailPrice) {
    return { error: "Bulk price must be less than or equal to the retail price." };
  }

  if (!Number.isFinite(minimumBulkQuantity) || minimumBulkQuantity < 1) {
    return { error: "Minimum bulk quantity must be at least 1." };
  }

  return {
    data: {
      name: payload.name.trim(),
      description: payload.description.trim(),
      category: payload.category,
      manufacturerName: payload.manufacturerName.trim(),
      price: retailPrice,
      bulkPrice: wholesalePrice,
      minBulkQty: minimumBulkQuantity,
      image: primaryImage,
      images: Array.isArray(payload.images) ? payload.images.filter(Boolean) : [primaryImage],
      location: payload.location,
      stock: payload.stock !== undefined ? (payload.stock === null ? null : Number(payload.stock)) : null,
      isActive: payload.isActive !== false,
      variants: Array.isArray(payload.variants)
        ? payload.variants.filter((v) => v.name?.trim() && Array.isArray(v.options))
        : [],
    },
  };
}

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    const { searchParams } = request.nextUrl;
    const location = searchParams.get("location");
    const sellerId = searchParams.get("sellerId");
    const category = searchParams.get("category");
    const search = searchParams.get("search");
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "50", 10)));
    const showAll = searchParams.get("all") === "true";

    const filter: Record<string, unknown> = {};
    if (!showAll) filter.isActive = { $ne: false };
    if (location && location !== "All Locations") filter.location = location;
    if (sellerId) filter.sellerId = sellerId;
    if (category && category !== "All") filter.category = category;
    if (search?.trim()) {
      const regex = new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      filter.$or = [{ name: regex }, { description: regex }, { manufacturerName: regex }];
    }

    const [products, total] = await Promise.all([
      Product.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Product.countDocuments(filter),
    ]);

    return NextResponse.json({
      products: JSON.parse(JSON.stringify(products)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to fetch products.",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const body = (await request.json()) as Partial<ProductPayload>;
    const validation = validateProductPayload(body);

    if ("error" in validation) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    await connectToDatabase();
    const product = await Product.create({ ...validation.data, sellerId: session.user.id });

    return NextResponse.json(
      {
        product: JSON.parse(JSON.stringify(product)),
      },
      { status: 201 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to create product.",
      },
      { status: 500 },
    );
  }
}
