import { NextResponse } from "next/server";
import { query } from "@/lib/postgres";

type CashierOrderRow = {
  id: string;
  status: string;
  created_at: string;
  is_paid: boolean;
  table_id: string;
  table_name: string;
  item_id: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  product_name: string;
  product_price: number;
};

type CashierOrderItemResponse = {
  id: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  products: {
    name: string;
    price: number;
  };
};

type CashierOrderResponse = {
  id: string;
  status: string;
  created_at: string;
  is_paid: boolean;
  table_id: string;
  tables: {
    name: string;
  };
  order_items: CashierOrderItemResponse[];
};

export async function GET() {
  try {
    const rows = await query<CashierOrderRow>(
      `
      SELECT
        o.id,
        o.status,
        o.created_at,
        o.is_paid,
        o.table_id,
        t.name AS table_name,
        oi.id AS item_id,
        oi.quantity,
        oi.unit_price,
        oi.line_total,
        p.name AS product_name,
        p.price AS product_price
      FROM orders o
      JOIN tables t ON t.id = o.table_id
      JOIN order_items oi ON oi.order_id = o.id
      JOIN products p ON p.id = oi.product_id
      WHERE o.status = 'completed' AND o.is_paid = false
      ORDER BY o.created_at ASC
      `
    );

    const grouped = Object.values(
      rows.reduce<Record<string, CashierOrderResponse>>((acc, row) => {
        if (!acc[row.id]) {
          acc[row.id] = {
            id: row.id,
            status: row.status,
            created_at: row.created_at,
            is_paid: row.is_paid,
            table_id: row.table_id,
            tables: { name: row.table_name },
            order_items: [],
          };
        }

        acc[row.id].order_items.push({
          id: row.item_id,
          quantity: row.quantity,
          unit_price: row.unit_price,
          line_total: row.line_total,
          products: {
            name: row.product_name,
            price: row.product_price,
          },
        });

        return acc;
      }, {})
    );

    return NextResponse.json({ data: grouped, error: null });
  } catch (error) {
    console.error("[/api/cashier/orders] error:", error);
    return NextResponse.json(
      {
        data: null,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
