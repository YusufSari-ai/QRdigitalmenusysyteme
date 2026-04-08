-- ============================================================
-- Migration 002: orders ↔ tables foreign key + missing columns
-- Run in: Supabase Dashboard → SQL Editor
-- Safe to re-run (all steps are idempotent).
-- ============================================================

-- ─── 1. Ensure tables table exists ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tables (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name  TEXT        NOT NULL,
  sort_order  INTEGER     NOT NULL DEFAULT 0,
  is_active   BOOLEAN     NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── 2. Ensure orders table exists ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  table_id    UUID,                          -- FK added below
  waiter_id   UUID,
  order_no    TEXT,
  status      TEXT        NOT NULL DEFAULT 'open',
  note        TEXT,
  is_ready    BOOLEAN     NOT NULL DEFAULT false,
  is_paid     BOOLEAN     NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at   TIMESTAMPTZ
);

-- ─── 3. Add missing columns to orders (if table already existed) ──────────────
ALTER TABLE orders ADD COLUMN IF NOT EXISTS table_id  UUID;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS is_ready  BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS is_paid   BOOLEAN NOT NULL DEFAULT false;

-- ─── 4. Migrate table_name → table_id for any legacy rows ────────────────────
-- If orders was originally created with a table_name TEXT column instead of
-- table_id, this block back-fills table_id by matching names. Safe to run even
-- if the table_name column does not exist (the IF EXISTS guard prevents errors).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'orders'
      AND column_name  = 'table_name'
  ) THEN
    EXECUTE '
      UPDATE orders o
      SET    table_id = t.id
      FROM   tables t
      WHERE  o.table_id IS NULL
        AND  t.table_name = o.table_name
    ';
  END IF;
END $$;

-- ─── 5. Add the foreign key constraint ───────────────────────────────────────
-- Only adds if it does not already exist, so re-running is safe.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM   information_schema.table_constraints
    WHERE  constraint_type  = 'FOREIGN KEY'
      AND  table_schema     = 'public'
      AND  table_name       = 'orders'
      AND  constraint_name  = 'orders_table_id_fkey'
  ) THEN
    ALTER TABLE orders
      ADD CONSTRAINT orders_table_id_fkey
      FOREIGN KEY (table_id) REFERENCES tables(id)
      ON DELETE SET NULL;
  END IF;
END $$;

-- ─── 6. Ensure order_items table exists with its FK to orders ────────────────
CREATE TABLE IF NOT EXISTS order_items (
  id           UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id     UUID           NOT NULL REFERENCES orders(id)   ON DELETE CASCADE,
  product_id   UUID           NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity     INTEGER        NOT NULL CHECK (quantity > 0),
  unit_price   NUMERIC(10, 2) NOT NULL,
  line_total   NUMERIC(10, 2) NOT NULL,
  status       TEXT           NOT NULL DEFAULT 'pending',
  note         TEXT,
  prepared_by  UUID,
  served_by    UUID,
  created_at   TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  cancelled_at TIMESTAMPTZ,
  cancelled_by UUID
);

-- ─── 7. Indexes ───────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_orders_table_id   ON orders(table_id);
CREATE INDEX IF NOT EXISTS idx_orders_status     ON orders(status);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);

-- ─── 8. RLS ───────────────────────────────────────────────────────────────────
ALTER TABLE tables      ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders      ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- tables: public read, authenticated write
CREATE POLICY IF NOT EXISTS "public_read_tables"
  ON tables FOR SELECT USING (true);

CREATE POLICY IF NOT EXISTS "auth_write_tables"
  ON tables FOR ALL USING (auth.role() = 'authenticated');

-- orders: authenticated read/write (staff only)
CREATE POLICY IF NOT EXISTS "auth_read_orders"
  ON orders FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY IF NOT EXISTS "auth_write_orders"
  ON orders FOR ALL USING (auth.role() = 'authenticated');

-- order_items: authenticated read/write
CREATE POLICY IF NOT EXISTS "auth_read_order_items"
  ON order_items FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY IF NOT EXISTS "auth_write_order_items"
  ON order_items FOR ALL USING (auth.role() = 'authenticated');
