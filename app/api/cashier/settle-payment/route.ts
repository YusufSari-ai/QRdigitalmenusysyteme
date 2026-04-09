import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/postgres";

type SettlePaymentSelectionItem = {
  order_item_id: number;
  quantity_paid: number;
  unit_price: number;
  line_total: number;
};

type SettlePaymentPayload = {
  table_id: string;
  payment_method: string | null;
  note: string | null;
  items: SettlePaymentSelectionItem[];
};

export async function POST(request: NextRequest) {
  const client = await pool.connect();

  try {
    const body = (await request.json()) as SettlePaymentPayload;

    if (!body.table_id || !Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json(
        { error: "Missing table_id or items" },
        { status: 400 }
      );
    }

    const totalAmount = body.items.reduce((sum, item) => sum + item.line_total, 0);

    await client.query("BEGIN");

    const paymentInsert = await client.query(
      `
      INSERT INTO payments (table_id, payment_method, note, total_amount)
      VALUES ($1, $2, $3, $4)
      RETURNING id
      `,
      [body.table_id, body.payment_method, body.note, totalAmount]
    );

    const paymentId = paymentInsert.rows[0]?.id;

    for (const item of body.items) {
      await client.query(
        `
        INSERT INTO payment_items (payment_id, order_item_id, quantity_paid, unit_price, line_total)
        VALUES ($1, $2, $3, $4, $5)
        `,
        [
          paymentId,
          item.order_item_id,
          item.quantity_paid,
          item.unit_price,
          item.line_total,
        ]
      );
    }

    const orderItemIds = body.items.map((i) => i.order_item_id);

    const orderRows = await client.query(
      `
      SELECT DISTINCT order_id
      FROM order_items
      WHERE id = ANY($1::bigint[])
      `,
      [orderItemIds]
    );

    const uniqueOrderIds = orderRows.rows.map((r) => Number(r.order_id));

    for (const orderId of uniqueOrderIds) {
      const orderedRows = await client.query(
        `
        SELECT id, quantity
        FROM order_items
        WHERE order_id = $1
        `,
        [orderId]
      );

      let fullyPaid = true;

      for (const ordered of orderedRows.rows) {
        const paidRow = await client.query(
          `
          SELECT COALESCE(SUM(quantity_paid), 0) AS paid_quantity
          FROM payment_items
          WHERE order_item_id = $1
          `,
          [ordered.id]
        );

        const paidQuantity = Number(paidRow.rows[0]?.paid_quantity ?? 0);
        const orderedQuantity = Number(ordered.quantity ?? 0);

        if (paidQuantity < orderedQuantity) {
          fullyPaid = false;
          break;
        }
      }

      if (fullyPaid) {
        await client.query(
          `
          UPDATE orders
          SET status = 'paid',
              is_paid = true,
              closed_at = NOW()
          WHERE id = $1
          `,
          [orderId]
        );
      }
    }

    await client.query("COMMIT");

    return NextResponse.json({ error: null, paymentId });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("[/api/cashier/settle-payment] error:", error);
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
