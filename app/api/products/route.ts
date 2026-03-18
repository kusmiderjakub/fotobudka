import { NextResponse } from "next/server";
import {
  getProducts,
  getProductImages,
  getEditorModules,
} from "@/lib/printbox";

const FAMILY_ID = 323; // Cards family

export async function GET() {
  try {
    const [products, editorModules] = await Promise.all([
      getProducts(FAMILY_ID),
      getEditorModules(FAMILY_ID),
    ]);

    const defaultEditor =
      editorModules.find((m) => m.is_default && m.is_enabled) ??
      editorModules.find((m) => m.is_enabled) ??
      null;

    const productsWithImages = await Promise.all(
      products.map(async (product) => {
        let image: string | null = null;
        try {
          const images = await getProductImages(product.id);
          if (images.length > 0) {
            image = images[0].image;
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

    return NextResponse.json(productsWithImages);
  } catch (error) {
    console.error("Failed to fetch products:", error);
    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 500 }
    );
  }
}
