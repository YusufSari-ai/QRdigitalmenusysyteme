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

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, image_url, orderIndex, card_type } = body;

    await query(
      `
      INSERT INTO categories (name, image_url, "orderIndex", card_type)
      VALUES ($1, $2, $3, $4)
      `,
      [name, image_url, orderIndex, card_type]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[POST /api/admin/categories] error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Create failed",
      },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id, name, image_url, orderIndex, card_type } = body;

    await query(
      `
      UPDATE categories
      SET name = $1,
          image_url = $2,
          "orderIndex" = $3,
          card_type = $4
      WHERE id = $5
      `,
      [name, image_url, orderIndex, card_type, id]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[PUT /api/admin/categories] error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Update failed",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const { id } = await req.json();

    await query(`DELETE FROM products WHERE "categoryId" = $1`, [id]);
    await query(`DELETE FROM categories WHERE id = $1`, [id]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/admin/categories] error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Delete failed",
      },
      { status: 500 }
    );
  }
}
