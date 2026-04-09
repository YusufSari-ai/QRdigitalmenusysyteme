import { NextResponse } from "next/server";
import { query } from "@/lib/postgres";

type KitchenOrderRow = {
  id: string;
  status: "open" | "in_progress";
  created_at: string;
  is_ready: boolean;
  is_paid: boolean;
  note: string | null;
  table_id: string;
  table_name: string;
  item_id: string;
  quantity: number;
  unit_price: number;
  product_id: string;
  product_name: string;
  product_price: number;
};

type KitchenOrderItemResponse = {
  id: string;
  quantity: number;
  unit_price: number;
  product_id: string;
  products: {
    name: string;
    price: number;
  };
};

type KitchenOrderResponse = {
  id: string;
  status: "open" | "in_progress";
  created_at: string;
  is_ready: boolean;
  is_paid: boolean;
  note: string | null;
  table_id: string;
  tables: {
    name: string;
  };
  order_items: KitchenOrderItemResponse[];
};

export async function GET() {
  try {
    const rows = await query<KitchenOrderRow>(
      `
      SELECT
        o.id,
        o.status,
        o.created_at,
        o.is_ready,
        o.is_paid,
        o.note,
        o.table_id,
        t.name AS table_name,
        oi.id AS item_id,
        oi.quantity,
        oi.unit_price,
        oi.product_id,
        p.name AS product_name,
        p.price AS product_price
      FROM orders o
      JOIN tables t ON t.id = o.table_id
      JOIN order_items oi ON oi.order_id = o.id
      JOIN products p ON p.id = oi.product_id
      WHERE o.status IN ('open', 'in_progress')
      ORDER BY o.created_at DESC
      `
    );

    const grouped = Object.values(
      rows.reduce<Record<string, KitchenOrderResponse>>((acc, row) => {
        if (!acc[row.id]) {
          acc[row.id] = {
            id: row.id,
            status: row.status,
            created_at: row.created_at,
            is_ready: row.is_ready,
            is_paid: row.is_paid,
            note: row.note,
            table_id: row.table_id,
            tables: { name: row.table_name },
            order_items: [],
          };
        }

        acc[row.id].order_items.push({
          id: row.item_id,
          quantity: row.quantity,
          unit_price: row.unit_price,
          product_id: row.product_id,
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
    console.error("[/api/kitchen/orders] error:", error);
    return NextResponse.json(
      {
        data: null,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
