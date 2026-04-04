-- =============================================================================
-- Orders System – DDL
-- Run this once in your Supabase SQL Editor (or as a migration).
-- Safe to re-run: uses IF NOT EXISTS / CREATE OR REPLACE throughout.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 0. Shared helper: auto-update updated_at on every write
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ---------------------------------------------------------------------------
-- 1. tables  (restaurant seating)
--    Note: "status" is NOT stored here — it is derived from open orders (VERSION.md §3.1).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tables (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name  TEXT        NOT NULL,
  sort_order  INTEGER     NOT NULL DEFAULT 0,
  is_active   BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT tables_table_name_unique UNIQUE (table_name)
);

CREATE OR REPLACE TRIGGER tables_set_updated_at
  BEFORE UPDATE ON tables
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Index: waiter / kitchen UIs will list active tables frequently
CREATE INDEX IF NOT EXISTS idx_tables_is_active ON tables (is_active);


-- ---------------------------------------------------------------------------
-- 2. orders
--    order_no: human-readable, DB-generated, collision-safe.
--    status:   enforced by CHECK; transition logic lives in the application.
--    Security: prices are NEVER stored here — they live only in order_items.
-- ---------------------------------------------------------------------------
CREATE SEQUENCE IF NOT EXISTS order_no_seq START 1 INCREMENT 1;

CREATE TABLE IF NOT EXISTS orders (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  table_id    UUID        NOT NULL
                REFERENCES tables(id) ON DELETE RESTRICT,
  waiter_id   UUID
                REFERENCES auth.users(id) ON DELETE SET NULL,
  order_no    TEXT        NOT NULL UNIQUE
                DEFAULT ('ORD-' || LPAD(nextval('order_no_seq')::TEXT, 5, '0')),
  status      TEXT        NOT NULL DEFAULT 'open'
                CHECK (status IN (
                  'open',
                  'in_progress',
                  'partially_completed',
                  'completed',
                  'paid',
                  'cancelled'
                )),
  note        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at   TIMESTAMPTZ,

  -- closed_at must be set when the order reaches a terminal state
  CONSTRAINT orders_closed_at_terminal CHECK (
    status NOT IN ('paid', 'cancelled') OR closed_at IS NOT NULL
  )
);

CREATE OR REPLACE TRIGGER orders_set_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Indexes from VERSION.md §16
CREATE INDEX IF NOT EXISTS idx_orders_table_id  ON orders (table_id);
CREATE INDEX IF NOT EXISTS idx_orders_status    ON orders (status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders (created_at DESC);


-- ---------------------------------------------------------------------------
-- 3. order_items  (operational unit — the heart of the system)
--    unit_price: locked in at insert time from products.price (never from frontend).
--    line_total: stored redundantly for fast aggregation; enforced == unit_price * quantity.
--    status:     item-level state machine (kitchen/bar tracks this).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS order_items (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id     UUID        NOT NULL
                 REFERENCES orders(id) ON DELETE CASCADE,
  product_id   UUID        NOT NULL
                 REFERENCES products(id) ON DELETE RESTRICT,
  quantity     INTEGER     NOT NULL CHECK (quantity > 0),
  unit_price   NUMERIC(10,2) NOT NULL CHECK (unit_price >= 0),
  line_total   NUMERIC(10,2) NOT NULL CHECK (line_total >= 0),
  status       TEXT        NOT NULL DEFAULT 'pending'
                 CHECK (status IN (
                   'pending',
                   'preparing',
                   'ready',
                   'served',
                   'paid',
                   'cancelled'
                 )),
  note         TEXT,
  prepared_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  served_by    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  cancelled_at TIMESTAMPTZ,
  cancelled_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Integrity: line_total must equal unit_price × quantity (prices set server-side)
  CONSTRAINT order_items_line_total_correct
    CHECK (line_total = unit_price * quantity),

  -- cancelled_at must be set when the item is cancelled
  CONSTRAINT order_items_cancelled_at_set
    CHECK (status <> 'cancelled' OR cancelled_at IS NOT NULL)
);

CREATE OR REPLACE TRIGGER order_items_set_updated_at
  BEFORE UPDATE ON order_items
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Indexes from VERSION.md §16
CREATE INDEX IF NOT EXISTS idx_order_items_order_id   ON order_items (order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_status     ON order_items (status);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items (product_id);


-- ---------------------------------------------------------------------------
-- 4. Row Level Security
--    All write operations go through the Next.js API route which uses the
--    service role key (bypasses RLS). Enable RLS to block any direct
--    anon/client access that bypasses the API.
-- ---------------------------------------------------------------------------
ALTER TABLE tables      ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders      ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users (admin dashboard) to read tables
CREATE POLICY IF NOT EXISTS "tables_authenticated_read"
  ON tables FOR SELECT
  TO authenticated
  USING (true);

-- No anon policies on orders or order_items — all access must go via the API
-- (service role key bypasses RLS, so the API route works without explicit policies)


-- ---------------------------------------------------------------------------
-- 5. Helpful view: order summary with table name and item count
--    Used later by waiter / kitchen dashboards.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW order_summary AS
SELECT
  o.id,
  o.order_no,
  o.status,
  o.note,
  o.created_at,
  o.updated_at,
  o.closed_at,
  t.table_name,
  COUNT(oi.id)                               AS item_count,
  SUM(oi.line_total)                         AS total_amount,
  COUNT(oi.id) FILTER (WHERE oi.status = 'pending')   AS pending_count,
  COUNT(oi.id) FILTER (WHERE oi.status = 'preparing') AS preparing_count,
  COUNT(oi.id) FILTER (WHERE oi.status = 'ready')     AS ready_count,
  COUNT(oi.id) FILTER (WHERE oi.status = 'served')    AS served_count,
  COUNT(oi.id) FILTER (WHERE oi.status = 'cancelled') AS cancelled_count
FROM orders o
JOIN tables t ON t.id = o.table_id
LEFT JOIN order_items oi ON oi.order_id = o.id
GROUP BY o.id, t.table_name;


-- ---------------------------------------------------------------------------
-- 6. Sample data  (comment out before running in production)
-- ---------------------------------------------------------------------------
-- INSERT INTO tables (table_name, sort_order) VALUES
--   ('Table 1', 1),
--   ('Table 2', 2),
--   ('Table 3', 3),
--   ('Bar',     10);
