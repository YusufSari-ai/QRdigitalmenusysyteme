import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/postgres";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const orderId = body.orderId as string;

    if (!orderId) {
      return NextResponse.json({ error: "Missing orderId" }, { status: 400 });
    }

    await pool.query(
      `
      UPDATE orders
      SET status = 'in_progress'
      WHERE id = $1
      `,
      [orderId]
    );

    return NextResponse.json({ error: null });
  } catch (error) {
    console.error("[/api/kitchen/orders/start] error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
