-- =============================================================================
-- Migration 005: Role-based RLS for orders + order_items
-- Replaces the broad "any authenticated" policies from migration 003 with
-- policies that enforce profiles.role (waiter / kitchen / cashier / admin).
-- Safe to re-run — all DROPs are IF EXISTS.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Helper: read the caller's role from profiles.
--    SECURITY DEFINER so it bypasses profiles RLS and avoids recursion.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.auth_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid()
$$;

-- ---------------------------------------------------------------------------
-- 2. orders — drop the broad migration-003 policies, add role-scoped ones
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "auth_select_orders"  ON orders;
DROP POLICY IF EXISTS "auth_insert_orders"  ON orders;
DROP POLICY IF EXISTS "auth_update_orders"  ON orders;
DROP POLICY IF EXISTS "auth_delete_orders"  ON orders;

-- waiter (and admin) may INSERT new orders
CREATE POLICY "orders_insert"
  ON orders FOR INSERT
  WITH CHECK (
    public.auth_user_role() IN ('waiter', 'admin', 'super_admin')
  );

-- all operational staff may SELECT orders
CREATE POLICY "orders_select"
  ON orders FOR SELECT
  USING (
    public.auth_user_role() IN ('waiter', 'kitchen', 'cashier', 'admin', 'super_admin')
  );

-- kitchen updates status (open → in_progress → completed);
-- cashier updates status (→ paid) and is_paid flag
CREATE POLICY "orders_update"
  ON orders FOR UPDATE
  USING (
    public.auth_user_role() IN ('kitchen', 'cashier', 'admin', 'super_admin')
  );

-- only admin may hard-delete orders
CREATE POLICY "orders_delete"
  ON orders FOR DELETE
  USING (
    public.auth_user_role() IN ('admin', 'super_admin')
  );

-- ---------------------------------------------------------------------------
-- 3. order_items — drop broad policies, add role-scoped ones
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "auth_select_order_items"  ON order_items;
DROP POLICY IF EXISTS "auth_insert_order_items"  ON order_items;
DROP POLICY IF EXISTS "auth_update_order_items"  ON order_items;
DROP POLICY IF EXISTS "auth_delete_order_items"  ON order_items;

-- waiter (and admin) may INSERT items when creating an order
CREATE POLICY "order_items_insert"
  ON order_items FOR INSERT
  WITH CHECK (
    public.auth_user_role() IN ('waiter', 'admin', 'super_admin')
  );

-- kitchen, cashier, waiter, admin may SELECT items
CREATE POLICY "order_items_select"
  ON order_items FOR SELECT
  USING (
    public.auth_user_role() IN ('waiter', 'kitchen', 'cashier', 'admin', 'super_admin')
  );

-- kitchen updates item-level status (pending → preparing → ready → served)
-- cashier may also update (e.g. mark served/paid at item level)
CREATE POLICY "order_items_update"
  ON order_items FOR UPDATE
  USING (
    public.auth_user_role() IN ('kitchen', 'cashier', 'admin', 'super_admin')
  );

-- only admin may hard-delete order items
CREATE POLICY "order_items_delete"
  ON order_items FOR DELETE
  USING (
    public.auth_user_role() IN ('admin', 'super_admin')
  );

-- ---------------------------------------------------------------------------
-- 4. tables — already public SELECT (from migration 003).
--    No change needed for the required access matrix.
--    Confirmed policies:
--      "public_read_tables"  FOR SELECT USING (true)
--      "auth_insert_tables"  FOR INSERT WITH CHECK (auth.role() = 'authenticated')
--      "auth_update_tables"  FOR UPDATE USING (auth.role() = 'authenticated')
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- 5. products — already public SELECT (from migration 001).
--    No change needed for the required access matrix.
--    Confirmed policy:
--      "public_read_products"  FOR SELECT USING (true)
-- ---------------------------------------------------------------------------
