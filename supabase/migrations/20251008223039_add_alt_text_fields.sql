-- supabase/migrations/20251009000001_add_alt_text_fields.sql

-- 1. Add alt_text columns to the products table
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS main_image_alt TEXT,
ADD COLUMN IF NOT EXISTS gallery_alt_texts TEXT[];

-- 2. Add alt_text column to the product_variants table (for completeness)
ALTER TABLE public.product_variants
ADD COLUMN IF NOT EXISTS image_alt TEXT;