import mongoose from "mongoose";

import Product from "@/models/Product";
import { connectToDatabase } from "@/lib/db";
import type { ProductRecord } from "@/types";

export async function getAllProducts(location?: string): Promise<ProductRecord[]> {
  await connectToDatabase();

  const filter = location ? { location } : {};
  const products = await Product.find(filter).sort({ createdAt: -1 }).lean();

  return JSON.parse(JSON.stringify(products)) as ProductRecord[];
}

export async function getProductById(id: string): Promise<ProductRecord | null> {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return null;
  }

  await connectToDatabase();

  const product = await Product.findById(id).lean();

  if (!product) {
    return null;
  }

  return JSON.parse(JSON.stringify(product)) as ProductRecord;
}
