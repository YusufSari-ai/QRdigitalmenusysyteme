import { createSupabaseBrowserClient } from "./supabaseClient";
import type { CategoryWithProducts } from "@/types/category";
import type { Category } from "@/types/category";
import type { Product } from "@/types/product";
import type { RestaurantTable } from "@/types/table";
import type { CartItem } from "@/types/cart";

// ─── Customer: Single nested fetch (spec §5.1) ────────────────────────────────
export async function getMenuData(): Promise<{
  data: CategoryWithProducts[] | null;
  error: Error | null;
}> {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("categories")
    .select(
      `
      id,
      name,
      image_url,
      orderIndex,
      createdAt,
      card_type,
      products (
        id,
        name,
        description,
        tags,
        image_url,
        price,
        categoryId,
        orderIndex,
        createdAt
      )
    `
    )
    .order("orderIndex", { ascending: true })
    .order("orderIndex", { ascending: true, referencedTable: "products" });

  if (error) return { data: null, error: new Error(error.message) };
  return { data: data as CategoryWithProducts[], error: null };
}

// ─── Admin: Categories CRUD ───────────────────────────────────────────────────
export async function adminGetCategories(): Promise<{
  data: Category[] | null;
  error: Error | null;
}> {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("orderIndex", { ascending: true });
  if (error) return { data: null, error: new Error(error.message) };
  return { data, error: null };
}

export async function adminCreateCategory(payload: {
  name: string;
  image_url: string;
  orderIndex: number;
  card_type: "vertical" | "horizontal";
}): Promise<{ error: Error | null }> {
  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase.from("categories").insert([payload]);
  if (error) return { error: new Error(error.message) };
  return { error: null };
}

export async function adminUpdateCategory(
  id: string,
  payload: Partial<{ name: string; image_url: string; orderIndex: number; card_type: "vertical" | "horizontal" }>
): Promise<{ error: Error | null }> {
  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase
    .from("categories")
    .update(payload)
    .eq("id", id);
  if (error) return { error: new Error(error.message) };
  return { error: null };
}

export async function adminDeleteCategory(
  id: string
): Promise<{ error: Error | null }> {
  const supabase = createSupabaseBrowserClient();
  // Products are CASCADE deleted at DB level (spec §7.3)
  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) return { error: new Error(error.message) };
  return { error: null };
}

// ─── Admin: Products CRUD ─────────────────────────────────────────────────────
export async function adminGetProducts(): Promise<{
  data: Product[] | null;
  error: Error | null;
}> {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .order("orderIndex", { ascending: true });
  if (error) return { data: null, error: new Error(error.message) };
  return { data, error: null };
}

export async function adminCreateProduct(payload: {
  name: string;
  description: string;
  tags: string[];
  image_url: string;
  price: number;
  categoryId: string;
  orderIndex: number;
}): Promise<{ error: Error | null }> {
  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase.from("products").insert([payload]);
  if (error) return { error: new Error(error.message) };
  return { error: null };
}

export async function adminUpdateProduct(
  id: string,
  payload: Partial<{
    name: string;
    description: string;
    tags: string[];
    image_url: string;
    price: number;
    categoryId: string;
    orderIndex: number;
  }>
): Promise<{ error: Error | null }> {
  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase
    .from("products")
    .update(payload)
    .eq("id", id);
  if (error) return { error: new Error(error.message) };
  return { error: null };
}

export async function adminDeleteProduct(
  id: string
): Promise<{ error: Error | null }> {
  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) return { error: new Error(error.message) };
  return { error: null };
}

// ─── Waiter: tables + order creation ─────────────────────────────────────────

// Returns ALL tables — no status filter — for the waiter cart dropdown.
// Selects only id + name; the waiter panel doesn't need status/created_at.
export async function getTables(): Promise<{
  data: RestaurantTable[] | null;
  error: Error | null;
}> {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("tables")
    .select("id, name, status")
    .order("id", { ascending: true });

  if (error) {
    console.error("[getTables] Failed to fetch tables:", error);
    return { data: null, error: new Error(error.message) };
  }

  if (!data || data.length === 0) {
    console.warn("[getTables] Query succeeded but returned 0 tables.");
  }

  return { data: data as RestaurantTable[], error: null };
}

export async function placeOrder(
  tableId: string,
  _waiterId: string | null,
  items: CartItem[],
  note: string | null = null
): Promise<{ error: Error | null }> {
  const supabase = createSupabaseBrowserClient();

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert([{
      table_id: tableId,
      status: "open",
      is_ready: false,
      is_paid: false,
      note,
    }])
    .select("id")
    .single();

  if (orderError) {
    console.error("[placeOrder] Failed to insert order:", orderError);
    return { error: new Error(orderError.message) };
  }

  const orderItems = items.map((item) => ({
    order_id: order.id,
    product_id: item.product_id,
    quantity: item.quantity,
    unit_price: item.display_price,
    line_total: item.display_price * item.quantity,
  }));

  const { error: itemsError } = await supabase
    .from("order_items")
    .insert(orderItems);

  if (itemsError) {
    console.error("[placeOrder] Failed to insert order_items for order", order.id, ":", itemsError);
    return { error: new Error(`Order created (id: ${order.id}) but items failed to save: ${itemsError.message}`) };
  }

  return { error: null };
}

// ─── Kitchen: order queue ─────────────────────────────────────────────────────

export interface KitchenOrderItem {
  id: string;
  quantity: number;
  unit_price: number;
  product_id: string;
  // Supabase returns joined parent as object at runtime; typed loosely to satisfy compiler
  products: { name: string; price: number } | { name: string; price: number }[] | null;
}

export interface KitchenOrder {
  id: string;
  status: "open" | "in_progress";
  created_at: string;
  is_ready: boolean;
  is_paid: boolean;
  note: string | null;
  table_id: string;
  // Supabase returns joined parent as object at runtime; typed loosely to satisfy compiler
  tables: { name: string } | { name: string }[] | null;
  order_items: KitchenOrderItem[];
}

export async function getKitchenOrders(): Promise<{
  data: KitchenOrder[] | null;
  error: Error | null;
}> {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("orders")
    .select(
      `
      id,
      status,
      created_at,
      is_ready,
      is_paid,
      note,
      table_id,
      tables ( name ),
      order_items (
        id,
        quantity,
        unit_price,
        product_id,
        products ( name, price )
      )
    `
    )
    .in("status", ["open", "in_progress"])
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[getKitchenOrders] Failed to fetch orders:", error);
    return { data: null, error: new Error(error.message) };
  }
  return { data: data as unknown as KitchenOrder[], error: null };
}

export async function startPreparingOrder(
  orderId: string
): Promise<{ error: Error | null }> {
  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase
    .from("orders")
    .update({ status: "in_progress" })
    .eq("id", orderId);
  if (error) return { error: new Error(error.message) };
  return { error: null };
}

export async function serveOrder(
  orderId: string
): Promise<{ error: Error | null }> {
  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase
    .from("orders")
    .update({ status: "completed", is_ready: true, is_paid: false })
    .eq("id", orderId);
  if (error) return { error: new Error(error.message) };
  return { error: null };
}

// ─── Cashier: order queue + payment ──────────────────────────────────────────

export interface CashierOrderItem {
  id: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  products: { name: string; price: number } | { name: string; price: number }[] | null;
}

export interface CashierOrder {
  id: string;
  status: string;
  created_at: string;
  is_paid: boolean;
  table_id: string;
  tables: { name: string } | { name: string }[] | null;
  order_items: CashierOrderItem[];
}

export async function getCashierOrders(): Promise<{
  data: CashierOrder[] | null;
  error: Error | null;
}> {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("orders")
    .select(
      `
      id,
      status,
      created_at,
      is_paid,
      table_id,
      tables ( name ),
      order_items (
        id,
        quantity,
        unit_price,
        line_total,
        products ( name, price )
      )
    `
    )
    .eq("status", "completed")
    .eq("is_paid", false)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[getCashierOrders] Failed to fetch orders:", error);
    return { data: null, error: new Error(error.message) };
  }
  return { data: data as unknown as CashierOrder[], error: null };
}

export interface PaidOrder {
  id: string;
  status: string;
  created_at: string;
  closed_at: string | null;
  is_paid: boolean;
  table_id: string;
  tables: { name: string } | { name: string }[] | null;
  order_items: CashierOrderItem[];
}

export async function getPaidOrders(): Promise<{
  data: PaidOrder[] | null;
  error: Error | null;
}> {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("orders")
    .select(
      `
      id,
      status,
      created_at,
      closed_at,
      is_paid,
      table_id,
      tables ( name ),
      order_items (
        id,
        quantity,
        unit_price,
        line_total,
        products ( name, price )
      )
    `
    )
    .eq("is_paid", true)
    .order("closed_at", { ascending: false });

  if (error) {
    console.error("[getPaidOrders] Failed to fetch paid orders:", error);
    return { data: null, error: new Error(error.message) };
  }
  return { data: data as unknown as PaidOrder[], error: null };
}

export async function markOrderPaid(
  orderId: string
): Promise<{ error: Error | null }> {
  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase
    .from("orders")
    .update({
      status: "paid",
      is_paid: true,
      closed_at: new Date().toISOString(), // required by orders_closed_at_terminal CHECK
    })
    .eq("id", orderId);
  if (error) {
    console.error("[markOrderPaid] Failed to mark order paid:", orderId, error);
    return { error: new Error(error.message) };
  }
  return { error: null };
}

// ─── Cashier: item-based payment types ───────────────────────────────────────

export interface Payment {
  id: string;                      // uuid
  table_id: string;                // bigint (FK → tables.id)
  payment_method: string | null;
  note: string | null;
  total_amount: number;
  created_at: string;
}

export interface PaymentItem {
  id: number;                      // bigint
  payment_id: string;              // uuid
  order_item_id: number;           // bigint
  quantity_paid: number;
  unit_price: number;
  line_total: number;
}

export interface OrderItemPaymentSummary {
  order_item_id: number;
  ordered_quantity: number;
  paid_quantity: number;
  remaining_quantity: number;
  unit_price: number;
  product_name: string;
}

export interface SettlePaymentSelectionItem {
  order_item_id: number;
  quantity_paid: number;
  unit_price: number;
  line_total: number;
}

export interface SettlePaymentPayload {
  table_id: string;
  payment_method: string | null;
  note: string | null;
  items: SettlePaymentSelectionItem[];
}

// Returns a map of order_item_id → total paid quantity across all payments.
export async function getPaidQuantityByOrderItemIds(
  orderItemIds: number[]
): Promise<{ data: Record<number, number> | null; error: Error | null }> {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("payment_items")
    .select("order_item_id, quantity_paid")
    .in("order_item_id", orderItemIds);

  if (error) return { data: null, error: new Error(error.message) };

  const map: Record<number, number> = {};
  for (const row of data ?? []) {
    map[row.order_item_id] = (map[row.order_item_id] ?? 0) + row.quantity_paid;
  }
  return { data: map, error: null };
}

export async function getPaymentItemsByOrderItemIds(
  orderItemIds: number[]
): Promise<{ data: PaymentItem[] | null; error: Error | null }> {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("payment_items")
    .select("*")
    .in("order_item_id", orderItemIds);

  if (error) return { data: null, error: new Error(error.message) };
  return { data: data as PaymentItem[], error: null };
}

export async function createPayment(payload: {
  table_id: string;
  payment_method: string | null;
  note: string | null;
  total_amount: number;
}): Promise<{ data: Payment | null; error: Error | null }> {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("payments")
    .insert([payload])
    .select()
    .single();

  if (error) return { data: null, error: new Error(error.message) };
  return { data: data as Payment, error: null };
}

export async function createPaymentItems(
  items: Omit<PaymentItem, "id">[]
): Promise<{ error: Error | null }> {
  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase.from("payment_items").insert(items);
  if (error) return { error: new Error(error.message) };
  return { error: null };
}

export async function isOrderFullyPaid(
  orderId: number
): Promise<{ data: boolean | null; error: Error | null }> {
  const supabase = createSupabaseBrowserClient();

  const { data: orderItems, error: itemsError } = await supabase
    .from("order_items")
    .select("id, quantity")
    .eq("order_id", orderId);

  if (itemsError) return { data: null, error: new Error(itemsError.message) };
  if (!orderItems || orderItems.length === 0) return { data: true, error: null };

  const ids = orderItems.map((i) => i.id as number);
  const { data: paidMap, error: paidError } = await getPaidQuantityByOrderItemIds(ids);
  if (paidError) return { data: null, error: paidError };

  const fullyPaid = orderItems.every(
    (item) => (paidMap?.[item.id as number] ?? 0) >= item.quantity
  );
  return { data: fullyPaid, error: null };
}

export async function closeOrderAsPaid(
  orderId: number
): Promise<{ error: Error | null }> {
  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase
    .from("orders")
    .update({
      status: "paid",
      is_paid: true,
      closed_at: new Date().toISOString(),
    })
    .eq("id", orderId);
  if (error) return { error: new Error(error.message) };
  return { error: null };
}

// Creates one payment record covering all selected items (table-level), then
// auto-closes every affected order that is now fully paid.
export async function settlePaymentSelection(
  payload: SettlePaymentPayload
): Promise<{ error: Error | null }> {
  const totalAmount = payload.items.reduce((sum, item) => sum + item.line_total, 0);

  const { data: payment, error: paymentError } = await createPayment({
    table_id: payload.table_id,
    payment_method: payload.payment_method,
    note: payload.note,
    total_amount: totalAmount,
  });
  if (paymentError || !payment)
    return { error: paymentError ?? new Error("Payment creation failed") };

  const paymentItems: Omit<PaymentItem, "id">[] = payload.items.map((item) => ({
    payment_id: payment.id,
    order_item_id: item.order_item_id,
    quantity_paid: item.quantity_paid,
    unit_price: item.unit_price,
    line_total: item.line_total,
  }));

  const { error: itemsError } = await createPaymentItems(paymentItems);
  if (itemsError) return { error: itemsError };

  // Resolve which orders are affected, then close any that are now fully paid.
  const supabase = createSupabaseBrowserClient();
  const itemIds = payload.items.map((i) => i.order_item_id);

  const { data: orderRows, error: orderLookupErr } = await supabase
    .from("order_items")
    .select("order_id")
    .in("id", itemIds);

  if (orderLookupErr) return { error: new Error(orderLookupErr.message) };

  const uniqueOrderIds = [
    ...new Set((orderRows ?? []).map((r) => r.order_id as number)),
  ];

  for (const orderId of uniqueOrderIds) {
    const { data: fullyPaid, error: checkErr } = await isOrderFullyPaid(orderId);
    if (checkErr) return { error: checkErr };
    if (fullyPaid) {
      const { error: closeErr } = await closeOrderAsPaid(orderId);
      if (closeErr) return { error: closeErr };
    }
  }

  return { error: null };
}

// ─── Image upload ─────────────────────────────────────────────────────────────
// Max upload size synced with ImageUploader's client-side check.
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB

export async function uploadMenuImage(
  file: File,
  folder: "categories" | "products"
): Promise<{ url: string | null; error: Error | null }> {
  // Server-side size guard — client already validates, this is the backstop.
  if (file.size > MAX_IMAGE_BYTES) {
    return { url: null, error: new Error("Image must be smaller than 5 MB.") };
  }

  const supabase = createSupabaseBrowserClient();
  const ext = file.name.split(".").pop();
  const filename = `${folder}/${crypto.randomUUID()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("menu-images")
    .upload(filename, file, {
      upsert: false,
      contentType: file.type,
    });

  if (uploadError) return { url: null, error: new Error(uploadError.message) };

  const { data } = supabase.storage
    .from("menu-images")
    .getPublicUrl(filename);

  return { url: data.publicUrl, error: null };
}
