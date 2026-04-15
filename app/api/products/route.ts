import { NextRequest, NextResponse } from "next/server";
import {
  getProduct,
  getProductImages,
  getEditorModules,
} from "@/lib/printbox";

export const dynamic = "force-dynamic";

// Define the exact product IDs to display (in order)
const PRODUCT_IDS = [7361, 7433, 7434, 7435, 7436, 7437, 7438, 7439, 7440, 7441, 7442, 7443];

// In-memory cache with manual bust via ?refresh=1
let cachedProducts: { data: unknown[]; fetchedAt: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function GET(request: NextRequest) {
  try {
    const refresh = request.nextUrl.searchParams.get("refresh") === "1";

    if (!refresh && cachedProducts && Date.now() - cachedProducts.fetchedAt < CACHE_TTL) {
      return NextResponse.json(cachedProducts.data);
    }

    const products = await Promise.all(
      PRODUCT_IDS.map(async (id) => {
        const product = await getProduct(id);
        const editorModules = await getEditorModules(product.family_id);
        const defaultEditor =
          editorModules.find((m) => m.is_default && m.is_enabled) ??
          editorModules.find((m) => m.is_enabled) ??
          null;

        let image: string | null = null;
        try {
          const images = await getProductImages(id);
          if (images.length > 0) {
            const thumbs = images[0].thumbs;
            image = thumbs["900x900"] || thumbs["300x300"] || Object.values(thumbs)[0] || null;
          }
        } catch {
          // skip image fetch errors
        }

        return {
          ...product,
          image,
          editorModuleId: defaultEditor?.id ?? null,
        };
      })
    );

    cachedProducts = { data: products, fetchedAt: Date.now() };

    return NextResponse.json(products);
  } catch (error) {
    console.error("Failed to fetch products:", error);
    if (cachedProducts) {
      return NextResponse.json(cachedProducts.data);
    }
    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 500 }
    );
  }
}
