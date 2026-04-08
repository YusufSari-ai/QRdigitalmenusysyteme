-- ============================================================
-- Migration 004: Fix schema cache + column mismatches
-- Run in: Supabase Dashboard → SQL Editor
-- Safe to re-run — all steps are idempotent.
-- ============================================================
-- Fixes:
--   1. tables.name  — add if missing (migrates from table_name if it exists)
--   2. tables.status — add if missing (migrates from is_active if it exists)
--   3. order_items.order_id → orders.id FK — drop stale auto-name, add named FK
--   4. order_items.product_id → products.id FK — ensure named FK exists
--   5. orders.table_id → tables.id FK — ensure named FK exists
--   6. NOTIFY pgrst to flush the schema cache so joins work immediately
-- ============================================================


-- ─── 1. tables: ensure `name` column exists ──────────────────────────────────
ALTER TABLE tables ADD COLUMN IF NOT EXISTS name TEXT;

-- If the legacy `table_name` column exists, copy its values into `name`
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE  table_schema = 'public'
      AND  table_name   = 'tables'
      AND  column_name  = 'table_name'
  ) THEN
    UPDATE tables SET name = table_name WHERE name IS NULL;
  END IF;
END $$;


-- ─── 2. tables: ensure `status` column exists ────────────────────────────────
ALTER TABLE tables ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'available';

-- If the legacy `is_active` boolean column exists, derive status from it
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE  table_schema = 'public'
      AND  table_name   = 'tables'
      AND  column_name  = 'is_active'
  ) THEN
    UPDATE tables
    SET    status = CASE WHEN is_active THEN 'available' ELSE 'unavailable' END
    WHERE  status = 'available';   -- only rows not yet set by this run
  END IF;
END $$;


-- ─── 3. order_items: drop any auto-generated FK on order_id, add named one ──
-- Supabase auto-names inline FKs as <table>_<col>_fkey. We drop it if it
-- exists under any name that matches, then re-add with our canonical name so
-- PostgREST can find the relationship reliably.

DO $$
DECLARE
  r RECORD;
BEGIN
  -- Drop every existing FK on order_items.order_id (there may be 0 or 1)
  FOR r IN
    SELECT tc.constraint_name
    FROM   information_schema.table_constraints     tc
    JOIN   information_schema.key_column_usage      kcu
           ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema    = kcu.table_schema
    WHERE  tc.constraint_type = 'FOREIGN KEY'
      AND  tc.table_schema    = 'public'
      AND  tc.table_name      = 'order_items'
      AND  kcu.column_name    = 'order_id'
  LOOP
    EXECUTE format('ALTER TABLE order_items DROP CONSTRAINT %I', r.constraint_name);
  END LOOP;

  -- Re-add with canonical name
  ALTER TABLE order_items
    ADD CONSTRAINT order_items_order_id_fkey
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE;
END $$;


-- ─── 4. order_items: ensure named FK on product_id ───────────────────────────
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT tc.constraint_name
    FROM   information_schema.table_constraints     tc
    JOIN   information_schema.key_column_usage      kcu
           ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema    = kcu.table_schema
    WHERE  tc.constraint_type = 'FOREIGN KEY'
      AND  tc.table_schema    = 'public'
      AND  tc.table_name      = 'order_items'
      AND  kcu.column_name    = 'product_id'
      AND  tc.constraint_name != 'order_items_product_id_fkey'   -- keep if already correct
  LOOP
    EXECUTE format('ALTER TABLE order_items DROP CONSTRAINT %I', r.constraint_name);
  END LOOP;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE  constraint_type = 'FOREIGN KEY'
      AND  table_schema    = 'public'
      AND  table_name      = 'order_items'
      AND  constraint_name = 'order_items_product_id_fkey'
  ) THEN
    ALTER TABLE order_items
      ADD CONSTRAINT order_items_product_id_fkey
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT;
  END IF;
END $$;


-- ─── 5. orders: ensure named FK on table_id ──────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE  constraint_type = 'FOREIGN KEY'
      AND  table_schema    = 'public'
      AND  table_name      = 'orders'
      AND  constraint_name = 'orders_table_id_fkey'
  ) THEN
    ALTER TABLE orders
      ADD CONSTRAINT orders_table_id_fkey
      FOREIGN KEY (table_id) REFERENCES tables(id) ON DELETE SET NULL;
  END IF;
END $$;


-- ─── 6. Flush PostgREST schema cache ─────────────────────────────────────────
-- This tells the running PostgREST process to re-read the Postgres schema so
-- the new FK constraints are immediately visible for relational queries.
NOTIFY pgrst, 'reload schema';
