-- ============================================================
-- Migration 003: Fix missing FK constraints + RLS policies
-- Run in: Supabase Dashboard → SQL Editor
-- Safe to re-run — all steps are idempotent.
-- ============================================================
-- Fixes:
--   1. orders.table_id  → tables.id          (orders ↔ tables join)
--   2. order_items.order_id → orders.id       (orders ↔ order_items join)
--   3. order_items.product_id → products.id   (order_items ↔ products join)
--   4. RLS policies so authenticated staff can read/write orders & order_items
--   5. Public read on tables so the waiter table selector loads
-- ============================================================

-- ─── 1. Add missing columns to orders if they don't exist ────────────────────
ALTER TABLE orders ADD COLUMN IF NOT EXISTS table_id  UUID;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS is_ready  BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS is_paid   BOOLEAN NOT NULL DEFAULT false;

-- ─── 2. orders.table_id → tables.id ─────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_type = 'FOREIGN KEY'
      AND table_schema     = 'public'
      AND table_name       = 'orders'
      AND constraint_name  = 'orders_table_id_fkey'
  ) THEN
    ALTER TABLE orders
      ADD CONSTRAINT orders_table_id_fkey
      FOREIGN KEY (table_id) REFERENCES tables(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ─── 3. order_items.order_id → orders.id ─────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_type = 'FOREIGN KEY'
      AND table_schema     = 'public'
      AND table_name       = 'order_items'
      AND constraint_name  = 'order_items_order_id_fkey'
  ) THEN
    ALTER TABLE order_items
      ADD CONSTRAINT order_items_order_id_fkey
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ─── 4. order_items.product_id → products.id ─────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_type = 'FOREIGN KEY'
      AND table_schema     = 'public'
      AND table_name       = 'order_items'
      AND constraint_name  = 'order_items_product_id_fkey'
  ) THEN
    ALTER TABLE order_items
      ADD CONSTRAINT order_items_product_id_fkey
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT;
  END IF;
END $$;

-- ─── 5. Indexes (idempotent) ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_orders_table_id    ON orders(table_id);
CREATE INDEX IF NOT EXISTS idx_orders_status      ON orders(status);
CREATE INDEX IF NOT EXISTS idx_order_items_order  ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product ON order_items(product_id);

-- ─── 6. RLS: tables — public SELECT so waiter dropdown loads ─────────────────
ALTER TABLE tables ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_tables"  ON tables;
DROP POLICY IF EXISTS "auth_write_tables"   ON tables;

CREATE POLICY "public_read_tables"
  ON tables FOR SELECT
  USING (true);

CREATE POLICY "auth_insert_tables"
  ON tables FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "auth_update_tables"
  ON tables FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "auth_delete_tables"
  ON tables FOR DELETE
  USING (auth.role() = 'authenticated');

-- ─── 7. RLS: orders — authenticated staff read/write ─────────────────────────
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_read_orders"   ON orders;
DROP POLICY IF EXISTS "auth_write_orders"  ON orders;
DROP POLICY IF EXISTS "auth_all_orders"    ON orders;

CREATE POLICY "auth_select_orders"
  ON orders FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "auth_insert_orders"
  ON orders FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "auth_update_orders"
  ON orders FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "auth_delete_orders"
  ON orders FOR DELETE
  USING (auth.role() = 'authenticated');

-- ─── 8. RLS: order_items — authenticated staff read/write ────────────────────
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_read_order_items"   ON order_items;
DROP POLICY IF EXISTS "auth_write_order_items"  ON order_items;
DROP POLICY IF EXISTS "auth_all_order_items"    ON order_items;

CREATE POLICY "auth_select_order_items"
  ON order_items FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "auth_insert_order_items"
  ON order_items FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "auth_update_order_items"
  ON order_items FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "auth_delete_order_items"
  ON order_items FOR DELETE
  USING (auth.role() = 'authenticated');
