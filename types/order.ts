export type OrderStatus =
  | "open"
  | "in_progress"
  | "partially_completed"
  | "completed"
  | "paid"
  | "cancelled";

export type OrderItemStatus =
  | "pending"
  | "preparing"
  | "ready"
  | "served"
  | "paid"
  | "cancelled";

export interface Order {
  id: string;
  table_id: string;
  waiter_id: string | null;
  order_no: string;
  status: OrderStatus;
  note: string | null;
  is_ready: boolean;
  is_paid: boolean;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  status: OrderItemStatus;
  note: string | null;
  prepared_by: string | null;
  served_by: string | null;
  created_at: string;
  updated_at: string;
  cancelled_at: string | null;
  cancelled_by: string | null;
}
