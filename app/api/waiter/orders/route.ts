import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/postgres";

type CartItem = {
  product_id: string;
  quantity: number;
  display_price: number;
};

export async function POST(request: NextRequest) {
  const client = await pool.connect();

  try {
    const body = await request.json();
    const tableId = body.tableId as string;
    const items = body.items as CartItem[];
    const note = (body.note as string | null) ?? null;

    if (!tableId || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "Missing tableId or items." },
        { status: 400 }
      );
    }

    await client.query("BEGIN");

    const orderInsert = await client.query(
      `
      INSERT INTO orders (table_id, status, is_ready, is_paid, note)
      VALUES ($1, 'open', false, false, $2)
      RETURNING id
      `,
      [tableId, note]
    );

    const orderId = orderInsert.rows[0]?.id;

    for (const item of items) {
      await client.query(
        `
        INSERT INTO order_items (order_id, product_id, quantity, unit_price, line_total)
        VALUES ($1, $2, $3, $4, $5)
        `,
        [
          orderId,
          item.product_id,
          item.quantity,
          item.display_price,
          item.display_price * item.quantity,
        ]
      );
    }

    await client.query("COMMIT");

    return NextResponse.json({ error: null, orderId });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("[/api/waiter/orders] error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
