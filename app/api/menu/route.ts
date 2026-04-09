import { NextResponse } from "next/server";
import { query } from "@/lib/postgres";

type ProductRow = {
  id: string;
  name: string;
  description: string | null;
  tags: string[] | null;
  image_url: string | null;
  price: number;
  categoryId: string;
  orderIndex: number;
  createdAt: string;
};

type CategoryRow = {
  id: string;
  name: string;
  image_url: string | null;
  orderIndex: number;
  createdAt: string;
  card_type: "vertical" | "horizontal";
};

export async function GET() {
  try {
    const categories = await query<CategoryRow>(
      `
      SELECT id, name, image_url, "orderIndex", "createdAt", card_type
      FROM categories
      ORDER BY "orderIndex" ASC
      `
    );

    const products = await query<ProductRow>(
      `
      SELECT id, name, description, tags, image_url, price, "categoryId", "orderIndex", "createdAt"
      FROM products
      ORDER BY "orderIndex" ASC
      `
    );

    const data = categories.map((category) => ({
      ...category,
      products: products.filter((p) => p.categoryId === category.id),
    }));

    return NextResponse.json({ data, error: null });
  } catch (error) {
    console.error("[/api/menu] error:", error);
    return NextResponse.json(
      {
        data: null,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
