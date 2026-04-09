import { NextResponse } from "next/server";
import { query } from "@/lib/postgres";

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
    const data = await query<CategoryRow>(
      `
      SELECT id, name, image_url, "orderIndex", "createdAt", card_type
      FROM categories
      ORDER BY "orderIndex" ASC
      `
    );

    return NextResponse.json({ data, error: null });
  } catch (error) {
    console.error("[/api/admin/categories] error:", error);
    return NextResponse.json(
      {
        data: null,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
