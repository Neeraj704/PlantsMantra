-- Add combo_product_ids column to products table to support grouping plant products into bundles
ALTER TABLE products ADD COLUMN IF NOT EXISTS combo_product_ids UUID[];
comment on column products.combo_product_ids is 'Array of product IDs that make up this combo/bundle';
