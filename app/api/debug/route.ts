import { NextResponse } from "next/server";
import {
  getProducts,
  getProductImages,
  getEditorModules,
} from "@/lib/printbox";

export const dynamic = "force-dynamic";

const FAMILY_ID = 323;

export async function GET() {
  try {
    const [products, editorModules] = await Promise.all([
      getProducts(FAMILY_ID),
      getEditorModules(FAMILY_ID),
    ]);

    const productsWithImages = await Promise.all(
      products.map(async (product) => {
        let images: { id: number; image: string; position: number }[] = [];
        try {
          images = await getProductImages(product.id);
        } catch {
          // skip
        }
        return { ...product, images };
      })
    );

    return NextResponse.json({
      familyId: FAMILY_ID,
      productCount: products.length,
      products: productsWithImages,
      editorModules,
    }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}
