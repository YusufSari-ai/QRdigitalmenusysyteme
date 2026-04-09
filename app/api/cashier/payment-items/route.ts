import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/postgres";

type PaymentItemRow = {
  id: number;
  payment_id: string;
  order_item_id: number;
  quantity_paid: number;
  unit_price: number;
  line_total: number;
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const orderItemIds = body.orderItemIds as number[];

    if (!Array.isArray(orderItemIds) || orderItemIds.length === 0) {
      return NextResponse.json({ data: [], error: null });
    }

    const data = await query<PaymentItemRow>(
      `
      SELECT id, payment_id, order_item_id, quantity_paid, unit_price, line_total
      FROM payment_items
      WHERE order_item_id = ANY($1::bigint[])
      ORDER BY id ASC
      `,
      [orderItemIds]
    );

    return NextResponse.json({ data, error: null });
  } catch (error) {
    console.error("[/api/cashier/payment-items] error:", error);
    return NextResponse.json(
      {
        data: null,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
