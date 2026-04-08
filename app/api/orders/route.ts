/**
 * POST /api/orders
 *
 * Creates an order with its items in two sequential inserts.
 * Security contract (VERSION.md §15):
 *   - Frontend sends only product_id + quantity; prices are NEVER trusted.
 *   - unit_price and line_total are always fetched from the products table here.
 *   - table_id is validated against the tables table (must be active).
 */
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabaseAdminClient";

interface OrderRequestItem {
  product_id: string;
  quantity: number;
}

interface OrderRequest {
  table_id: string;
  items: OrderRequestItem[];
  note?: string;
}

export async function POST(req: NextRequest) {
  // ── 1. Parse & basic validation ────────────────────────────────────────────
  let body: OrderRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { table_id, items, note } = body;

  if (!table_id || typeof table_id !== "string") {
    return NextResponse.json({ error: "table_id is required." }, { status: 400 });
  }

  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json(
      { error: "items must be a non-empty array." },
      { status: 400 }
    );
  }

  for (const item of items) {
    if (!item.product_id || typeof item.product_id !== "string") {
      return NextResponse.json(
        { error: "Each item must have a valid product_id." },
        { status: 400 }
      );
    }
    if (!Number.isInteger(item.quantity) || item.quantity < 1) {
      return NextResponse.json(
        { error: "Each item.quantity must be a positive integer." },
        { status: 400 }
      );
    }
  }

  const supabase = createSupabaseAdminClient();

  // ── 2. Validate table ──────────────────────────────────────────────────────
  const { data: table, error: tableError } = await supabase
    .from("tables")
    .select("id, status")
    .eq("id", table_id)
    .single();

  if (tableError || !table) {
    return NextResponse.json({ error: "Table not found." }, { status: 404 });
  }

  if (table.status !== "available") {
    return NextResponse.json(
      { error: "Table is not available." },
      { status: 409 }
    );
  }

  // ── 3. Fetch authoritative product prices from DB ──────────────────────────
  const productIds = [...new Set(items.map((i) => i.product_id))];

  const { data: products, error: productsError } = await supabase
    .from("products")
    .select("id, price")
    .in("id", productIds);

  if (productsError || !products) {
    return NextResponse.json(
      { error: "Failed to fetch products." },
      { status: 500 }
    );
  }

  const priceMap = new Map<string, number>(
    products.map((p: { id: string; price: number }) => [p.id, p.price])
  );

  // Ensure every requested product exists
  for (const item of items) {
    if (!priceMap.has(item.product_id)) {
      return NextResponse.json(
        { error: `Product not found: ${item.product_id}` },
        { status: 404 }
      );
    }
  }

  // ── 4. Create order ────────────────────────────────────────────────────────
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert([
      {
        table_id,
        waiter_id: null, // populated when waiter flow is added
        status: "open",
        note: note ?? null,
      },
    ])
    .select()
    .single();

  if (orderError || !order) {
    return NextResponse.json(
      { error: "Failed to create order.", detail: orderError?.message },
      { status: 500 }
    );
  }

  // ── 5. Create order_items (prices locked in at insertion time) ─────────────
  const orderItems = items.map((item) => {
    const unit_price = priceMap.get(item.product_id)!;
    return {
      order_id: order.id,
      product_id: item.product_id,
      quantity: item.quantity,
      unit_price,
      line_total: unit_price * item.quantity,
      status: "pending",
      note: null,
    };
  });

  const { error: itemsError } = await supabase
    .from("order_items")
    .insert(orderItems);

  if (itemsError) {
    console.error("[POST /api/orders] Failed to insert order_items for order", order.id, ":", itemsError.message);
    // Best-effort rollback: delete the orphaned order
    const { error: rollbackError } = await supabase.from("orders").delete().eq("id", order.id);
    if (rollbackError) {
      console.error("[POST /api/orders] Rollback failed — orphaned order:", order.id, rollbackError.message);
    }
    return NextResponse.json(
      { error: "Failed to create order items.", detail: itemsError.message },
      { status: 500 }
    );
  }

  // ── 6. Return created order ────────────────────────────────────────────────
  return NextResponse.json({ order }, { status: 201 });
}
