import { NextResponse } from "next/server";
import { apiFetchRaw } from "@/lib/printbox";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Fetch raw product 7361 to see ALL fields the API returns
    const rawProduct = await apiFetchRaw("/api/ec/v4/products/7361/");
    const rawProductImages = await apiFetchRaw("/api/ec/v4/products/7361/images/");

    return NextResponse.json({
      rawProduct,
      rawProductImages,
    }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}
