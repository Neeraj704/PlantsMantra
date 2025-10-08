-- supabase/migrations/20251009000000_add_seo_fields_to_products.sql

-- Add SEO-specific columns to the products table.
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS seo_title TEXT,
ADD COLUMN IF NOT EXISTS meta_description TEXT;

-- Update the RLS policy for 'products' to allow admins to write to the new columns.
-- Since the existing "Admins can update products" policy is FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')),
-- it should automatically cover the new columns. However, it's good practice to ensure
-- the RLS allows it explicitly.
-- Note: Supabase RLS is permissive by default for columns on an allowed row UPDATE.