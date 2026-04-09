import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/postgres";

type SummaryRow = {
  order_item_id: number;
  paid_quantity: string | number;
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const orderItemIds = body.orderItemIds as number[];

    if (!Array.isArray(orderItemIds) || orderItemIds.length === 0) {
      return NextResponse.json({ data: {}, error: null });
    }

    const rows = await query<SummaryRow>(
      `
      SELECT
        order_item_id,
        COALESCE(SUM(quantity_paid), 0) AS paid_quantity
      FROM payment_items
      WHERE order_item_id = ANY($1::bigint[])
      GROUP BY order_item_id
      `,
      [orderItemIds]
    );

    const map: Record<number, number> = {};
    for (const row of rows) {
      map[row.order_item_id] = Number(row.paid_quantity ?? 0);
    }

    return NextResponse.json({ data: map, error: null });
  } catch (error) {
    console.error("[/api/cashier/payment-summary] error:", error);
    return NextResponse.json(
      {
        data: null,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
