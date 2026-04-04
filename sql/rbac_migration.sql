-- =============================================================================
-- RBAC Migration — extend profiles.role to full staff role set
-- Run ONCE in Supabase SQL Editor after orders_system.sql.
-- Safe to re-run: uses IF NOT EXISTS / OR REPLACE / DO blocks.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Create profiles table (if it doesn't exist yet)
--    If it already exists this block is a no-op.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS profiles (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role       TEXT NOT NULL DEFAULT 'viewer',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- 2. Drop old CHECK constraint (may be named differently or absent)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  constraint_name TEXT;
BEGIN
  SELECT conname INTO constraint_name
  FROM pg_constraint
  WHERE conrelid = 'profiles'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) LIKE '%role%';

  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE profiles DROP CONSTRAINT %I', constraint_name);
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 3. Add the full role CHECK constraint
-- ---------------------------------------------------------------------------
ALTER TABLE profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN (
    'super_admin',
    'admin',
    'waiter',
    'kitchen',
    'bar',
    'cashier',
    'viewer'
  ));

-- ---------------------------------------------------------------------------
-- 4. Auto-create a profile row when a new auth user is created
--    Default role is 'viewer' — set the correct role manually afterwards.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, role)
  VALUES (NEW.id, 'viewer')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ---------------------------------------------------------------------------
-- 5. Row Level Security
-- ---------------------------------------------------------------------------
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Each user can read their own profile (needed by the login page)
CREATE POLICY IF NOT EXISTS "profiles_self_read"
  ON profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- Only super_admin / service role can write profiles (role assignment)
-- Writes go through the Supabase Dashboard or a future admin API endpoint.
-- No INSERT/UPDATE policy for authenticated users — use service role for that.

-- ---------------------------------------------------------------------------
-- 6. Index for fast role lookups
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles (role);

-- ---------------------------------------------------------------------------
-- 7. Backfill: preserve existing 'admin' accounts
--    Old 'admin' and 'viewer' values are still valid after step 3.
--    Run this only if you had rows with the old schema:
-- ---------------------------------------------------------------------------
-- UPDATE profiles SET role = 'admin' WHERE role = 'admin';  -- no-op, just for clarity
-- UPDATE profiles SET role = 'viewer' WHERE role = 'viewer'; -- no-op
