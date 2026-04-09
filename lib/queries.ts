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
  try {
    const res = await fetch("/api/menu", {
      method: "GET",
      cache: "no-store",
    });

    const json = await res.json();

    if (!res.ok) {
      return {
        data: null,
        error: new Error(json?.error || "Failed to fetch menu data"),
      };
    }

    return {
      data: json.data as CategoryWithProducts[],
      error: null,
    };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error("Unknown error"),
    };
  }
}

// ─── Admin: Categories CRUD ───────────────────────────────────────────────────
export async function adminGetCategories(): Promise<{
  data: Category[] | null;
  error: Error | null;
}> {
  try {
    const res = await fetch("/api/admin/categories", {
      method: "GET",
      cache: "no-store",
    });

    const json = await res.json();

    if (!res.ok) {
      return {
        data: null,
        error: new Error(json?.error || "Failed to fetch categories"),
      };
    }

    return {
      data: json.data as Category[],
      error: null,
    };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error("Unknown error"),
    };
  }
}

// ─── Admin: Products CRUD ─────────────────────────────────────────────────────
export async function adminGetProducts(): Promise<{
  data: Product[] | null;
  error: Error | null;
}> {
  try {
    const res = await fetch("/api/admin/products", {
      method: "GET",
      cache: "no-store",
    });

    const json = await res.json();

    if (!res.ok) {
      return {
        data: null,
        error: new Error(json?.error || "Failed to fetch products"),
      };
    }

    return {
      data: json.data as Product[],
      error: null,
    };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error("Unknown error"),
    };
  }
}

// ─── Waiter: tables + order creation ─────────────────────────────────────────

// Returns ALL tables — no status filter — for the waiter cart dropdown.
// Selects only id + name; the waiter panel doesn't need status/created_at.
export async function getTables(): Promise<{
  data: RestaurantTable[] | null;
  error: Error | null;
}> {
  try {
    const res = await fetch("/api/waiter/tables", {
      method: "GET",
      cache: "no-store",
    });

    const json = await res.json();

    if (!res.ok) {
      return {
        data: null,
        error: new Error(json?.error || "Failed to fetch tables"),
      };
    }

    return {
      data: json.data as RestaurantTable[],
      error: null,
    };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error("Unknown error"),
    };
  }
}

export async function placeOrder(
  tableId: string,
  _waiterId: string | null,
  items: CartItem[],
  note: string | null = null
): Promise<{ error: Error | null }> {
  try {
    const res = await fetch("/api/waiter/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        tableId,
        items,
        note,
      }),
    });

    const json = await res.json();

    if (!res.ok) {
      return {
        error: new Error(json?.error || "Failed to place order"),
      };
    }

    return { error: null };
  } catch (error) {
    return {
      error: error instanceof Error ? error : new Error("Unknown error"),
    };
  }
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
  try {
    const res = await fetch("/api/kitchen/orders", {
      method: "GET",
      cache: "no-store",
    });

    const json = await res.json();

    if (!res.ok) {
      return {
        data: null,
        error: new Error(json?.error || "Failed to fetch kitchen orders"),
      };
    }

    return {
      data: json.data as KitchenOrder[],
      error: null,
    };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error("Unknown error"),
    };
  }
}

export async function startPreparingOrder(
  orderId: string
): Promise<{ error: Error | null }> {
  try {
    const res = await fetch("/api/kitchen/orders/start", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ orderId }),
    });

    const json = await res.json();

    if (!res.ok) {
      return {
        error: new Error(json?.error || "Failed to start preparing order"),
      };
    }

    return { error: null };
  } catch (error) {
    return {
      error: error instanceof Error ? error : new Error("Unknown error"),
    };
  }
}

export async function serveOrder(
  orderId: string
): Promise<{ error: Error | null }> {
  try {
    const res = await fetch("/api/kitchen/orders/serve", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ orderId }),
    });

    const json = await res.json();

    if (!res.ok) {
      return {
        error: new Error(json?.error || "Failed to serve order"),
      };
    }

    return { error: null };
  } catch (error) {
    return {
      error: error instanceof Error ? error : new Error("Unknown error"),
    };
  }
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
  try {
    const res = await fetch("/api/cashier/orders", {
      method: "GET",
      cache: "no-store",
    });

    const json = await res.json();

    if (!res.ok) {
      return {
        data: null,
        error: new Error(json?.error || "Failed to fetch cashier orders"),
      };
    }

    return {
      data: json.data as CashierOrder[],
      error: null,
    };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error("Unknown error"),
    };
  }
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
  try {
    const res = await fetch("/api/cashier/paid-orders", {
      method: "GET",
      cache: "no-store",
    });

    const json = await res.json();

    if (!res.ok) {
      return {
        data: null,
        error: new Error(json?.error || "Failed to fetch paid orders"),
      };
    }

    // 🔥 group ediyoruz (en kritik kısım)
    const grouped: Record<string, PaidOrder> = {};

    for (const row of json.data) {
      if (!grouped[row.id]) {
        grouped[row.id] = {
  id: row.id,
  status: "paid",
  created_at: row.created_at,
  closed_at: row.closed_at,
  is_paid: true,
  table_id: row.table_id,
  tables: { name: row.table_name },
  order_items: [],
};
      }

      grouped[row.id].order_items.push({
  id: row.order_item_id,
  quantity: Number(row.quantity),
  unit_price: Number(row.unit_price),
  line_total: Number(row.line_total),
  products: {
    name: "Ödenen ürün",
    price: Number(row.unit_price),
  },
});
    }

    return {
      data: Object.values(grouped),
      error: null,
    };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error("Unknown error"),
    };
  }
}

export async function markOrderPaid(
  orderId: string
): Promise<{ error: Error | null }> {
  try {
    const res = await fetch("/api/cashier/mark-paid", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ orderId }),
    });

    const json = await res.json();

    if (!res.ok) {
      return {
        error: new Error(json?.error || "Failed to mark order paid"),
      };
    }

    return { error: null };
  } catch (error) {
    return {
      error: error instanceof Error ? error : new Error("Unknown error"),
    };
  }
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
  try {
    const res = await fetch("/api/cashier/payment-summary", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ orderItemIds }),
    });

    const json = await res.json();

    if (!res.ok) {
      return {
        data: null,
        error: new Error(json?.error || "Failed to fetch paid quantities"),
      };
    }

    return {
      data: json.data as Record<number, number>,
      error: null,
    };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error("Unknown error"),
    };
  }
}

export async function getPaymentItemsByOrderItemIds(
  orderItemIds: number[]
): Promise<{ data: PaymentItem[] | null; error: Error | null }> {
  try {
    const res = await fetch("/api/cashier/payment-items", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ orderItemIds }),
    });

    const json = await res.json();

    if (!res.ok) {
      return {
        data: null,
        error: new Error(json?.error || "Failed to fetch payment items"),
      };
    }

    return {
      data: json.data as PaymentItem[],
      error: null,
    };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error("Unknown error"),
    };
  }
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
  try {
    const res = await fetch("/api/cashier/settle-payment", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const json = await res.json();

    if (!res.ok) {
      return {
        error: new Error(json?.error || "Payment settlement failed"),
      };
    }

    return { error: null };
  } catch (error) {
    return {
      error: error instanceof Error ? error : new Error("Unknown error"),
    };
  }
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
// ===== TEMP FIX EXPORTS =====

export async function adminCreateCategory(payload: {
  name: string;
  image_url: string;
  orderIndex: number;
  card_type: "vertical" | "horizontal";
}): Promise<{ error: Error | null }> {
  try {
    const res = await fetch("/api/admin/categories", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const json = await res.json();

    if (!res.ok) {
      return { error: new Error(json?.error || "Failed to create category") };
    }

    return { error: null };
  } catch (error) {
    return {
      error: error instanceof Error ? error : new Error("Unknown error"),
    };
  }
}

export async function adminUpdateCategory(
  id: string,
  payload: Partial<{
    name: string;
    image_url: string;
    orderIndex: number;
    card_type: "vertical" | "horizontal";
  }>
): Promise<{ error: Error | null }> {
  try {
    const res = await fetch("/api/admin/categories", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ id, ...payload }),
    });

    const json = await res.json();

    if (!res.ok) {
      return { error: new Error(json?.error || "Failed to update category") };
    }

    return { error: null };
  } catch (error) {
    return {
      error: error instanceof Error ? error : new Error("Unknown error"),
    };
  }
}

export async function adminDeleteCategory(
  id: string
): Promise<{ error: Error | null }> {
  try {
    const res = await fetch("/api/admin/categories", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ id }),
    });

    const json = await res.json();

    if (!res.ok) {
      return { error: new Error(json?.error || "Failed to delete category") };
    }

    return { error: null };
  } catch (error) {
    return {
      error: error instanceof Error ? error : new Error("Unknown error"),
    };
  }
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
  try {
    const res = await fetch("/api/admin/products", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const json = await res.json();

    if (!res.ok) {
      return { error: new Error(json?.error || "Failed to create product") };
    }

    return { error: null };
  } catch (error) {
    return {
      error: error instanceof Error ? error : new Error("Unknown error"),
    };
  }
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
  try {
    const res = await fetch("/api/admin/products", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ id, ...payload }),
    });

    const json = await res.json();

    if (!res.ok) {
      return { error: new Error(json?.error || "Failed to update product") };
    }

    return { error: null };
  } catch (error) {
    return {
      error: error instanceof Error ? error : new Error("Unknown error"),
    };
  }
}

export async function adminDeleteProduct(
  id: string
): Promise<{ error: Error | null }> {
  try {
    const res = await fetch("/api/admin/products", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ id }),
    });

    const json = await res.json();

    if (!res.ok) {
      return { error: new Error(json?.error || "Failed to delete product") };
    }

    return { error: null };
  } catch (error) {
    return {
      error: error instanceof Error ? error : new Error("Unknown error"),
    };
  }
}
