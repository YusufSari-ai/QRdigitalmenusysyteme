-- ============================================================
-- QR Digital Menu — Supabase Database Migration
-- Run this in: Supabase Dashboard → SQL Editor
-- ============================================================

-- Enable UUID generation extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── Categories table ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS categories (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL CHECK (char_length(name) > 0),
  image_url   TEXT        NOT NULL,
  "orderIndex" INTEGER     NOT NULL DEFAULT 0,
  "createdAt"  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Products table ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS products (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT        NOT NULL CHECK (char_length(name) > 0),
  image_url    TEXT        NOT NULL,
  price        NUMERIC(10, 2) NOT NULL CHECK (price >= 0),   -- spec §4.1: MUST NOT be negative
  "categoryId" UUID        NOT NULL REFERENCES categories(id) ON DELETE CASCADE,  -- spec §7.3: CASCADE
  "orderIndex" INTEGER     NOT NULL DEFAULT 0,
  "createdAt"  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for ordering queries
CREATE INDEX IF NOT EXISTS idx_categories_order ON categories("orderIndex");
CREATE INDEX IF NOT EXISTS idx_products_order   ON products("orderIndex");
CREATE INDEX IF NOT EXISTS idx_products_category ON products("categoryId");

-- ─── Row Level Security ───────────────────────────────────────────────────────
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products   ENABLE ROW LEVEL SECURITY;

-- Categories: anyone can read (customer menu), only authenticated admins can write
CREATE POLICY "public_read_categories"
  ON categories FOR SELECT
  USING (true);

CREATE POLICY "admin_insert_categories"
  ON categories FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "admin_update_categories"
  ON categories FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "admin_delete_categories"
  ON categories FOR DELETE
  USING (auth.role() = 'authenticated');

-- Products: same pattern
CREATE POLICY "public_read_products"
  ON products FOR SELECT
  USING (true);

CREATE POLICY "admin_insert_products"
  ON products FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "admin_update_products"
  ON products FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "admin_delete_products"
  ON products FOR DELETE
  USING (auth.role() = 'authenticated');

-- ─── Storage Bucket ───────────────────────────────────────────────────────────
-- Run this AFTER creating the bucket named "menu-images" in the Storage dashboard.
--
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('menu-images', 'menu-images', true);
--
-- Storage policies (public read, authenticated write):
--
-- CREATE POLICY "public_read_menu_images"
--   ON storage.objects FOR SELECT
--   USING (bucket_id = 'menu-images');
--
-- CREATE POLICY "admin_upload_menu_images"
--   ON storage.objects FOR INSERT
--   WITH CHECK (bucket_id = 'menu-images' AND auth.role() = 'authenticated');
--
-- CREATE POLICY "admin_delete_menu_images"
--   ON storage.objects FOR DELETE
--   USING (bucket_id = 'menu-images' AND auth.role() = 'authenticated');
