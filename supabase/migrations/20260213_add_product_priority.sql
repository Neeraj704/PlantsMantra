-- Add optional priority column to products table
-- Lower number = higher priority. NULL = no priority (shown last).
ALTER TABLE products ADD COLUMN IF NOT EXISTS priority integer DEFAULT NULL;
