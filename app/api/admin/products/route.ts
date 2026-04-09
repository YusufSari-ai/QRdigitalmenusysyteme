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

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, description, tags, image_url, price, categoryId, orderIndex } = body;

    await query(
      `
      INSERT INTO products (name, description, tags, image_url, price, "categoryId", "orderIndex")
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      `,
      [name, description, tags, image_url, price, categoryId, orderIndex]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[POST /api/admin/products] error:", error);
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
    const { id, name, description, tags, image_url, price, categoryId, orderIndex } = body;

    await query(
      `
      UPDATE products
      SET name = $1,
          description = $2,
          tags = $3,
          image_url = $4,
          price = $5,
          "categoryId" = $6,
          "orderIndex" = $7
      WHERE id = $8
      `,
      [name, description, tags, image_url, price, categoryId, orderIndex, id]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[PUT /api/admin/products] error:", error);
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

    await query(`DELETE FROM products WHERE id = $1`, [id]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/admin/products] error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Delete failed",
      },
      { status: 500 }
    );
  }
}
