import { NextResponse } from "next/server";
import { query } from "@/lib/postgres";

export const dynamic = "force-dynamic";

type RemoveItemPayload = {
    table_id: string;
    items: {
        order_item_id: number;
        quantity_remove: number;
        order_id: string;
    }[];
};

export async function GET() {
    return NextResponse.json({ ok: true, route: "cashier/remove-items" });
}

export async function POST(req: Request) {
    try {
        const body = (await req.json()) as RemoveItemPayload;

        if (!body?.table_id || !Array.isArray(body.items) || body.items.length === 0) {
            return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 });
        }

        await query("BEGIN");

        try {
            for (const item of body.items) {
                const currentResult: any = await query(
                    `
          SELECT id, quantity, order_id, unit_price
          FROM order_items
          WHERE id = $1
          LIMIT 1
          `,
                    [item.order_item_id]
                );

                const currentRow = Array.isArray(currentResult)
                    ? currentResult[0]
                    : currentResult?.rows?.[0];

                if (!currentRow) {
                    throw new Error(`Order item bulunamadı: ${item.order_item_id}`);
                }

                const currentQty = Number(currentRow.quantity ?? 0);
                const removeQty = Number(item.quantity_remove ?? 0);

                if (removeQty <= 0) continue;

                const newQty = currentQty - removeQty;

                if (newQty > 0) {
                    await query(
                        `
            UPDATE order_items
            SET quantity = $1,
                line_total = unit_price * $1
            WHERE id = $2
            `,
                        [newQty, item.order_item_id]
                    );
                } else {
                    await query(
                        `
            DELETE FROM order_items
            WHERE id = $1
            `,
                        [item.order_item_id]
                    );
                }

            }

            await query(
                `
        DELETE FROM orders
        WHERE table_id = $1
          AND NOT EXISTS (
            SELECT 1
            FROM order_items
            WHERE order_items.order_id = orders.id
          )
        `,
                [body.table_id]
            );

            await query("COMMIT");

            return NextResponse.json({ success: true });
        } catch (error) {
            await query("ROLLBACK");
            throw error;
        }
    } catch (error) {
        console.error("[/api/cashier/remove-items] error:", error);
        return NextResponse.json(
            {
                error:
                    error instanceof Error ? error.message : "Ürün silme işlemi başarısız.",
            },
            { status: 500 }
        );
    }
}