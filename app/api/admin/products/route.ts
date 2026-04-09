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

export async function GET() {
  try {
    const data = await query<ProductRow>(
      `
      SELECT id, name, description, tags, image_url, price, "categoryId", "orderIndex", "createdAt"
      FROM products
      ORDER BY "orderIndex" ASC
      `
    );

    return NextResponse.json({ data, error: null });
  } catch (error) {
    console.error("[/api/admin/products] error:", error);
    return NextResponse.json(
      {
        data: null,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
