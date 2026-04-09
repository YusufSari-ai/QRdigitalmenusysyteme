import { NextResponse } from "next/server";
import { query } from "@/lib/postgres";

export async function GET() {
  try {
    const data = await query(`
      SELECT 
        o.id,
        o.created_at,
        o.closed_at,
        o.table_id,
        t.name as table_name,
        oi.id as order_item_id,
        oi.quantity,
        oi.unit_price,
        oi.line_total
      FROM orders o
      JOIN tables t ON t.id = o.table_id
      JOIN order_items oi ON oi.order_id = o.id
      WHERE o.is_paid = true
      ORDER BY o.closed_at DESC
    `);

    return NextResponse.json({ data, error: null });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { data: null, error: "failed" },
      { status: 500 }
    );
  }
}
