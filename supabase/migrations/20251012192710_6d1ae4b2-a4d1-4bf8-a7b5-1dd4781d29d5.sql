-- Add more fields to coupons table for real-world usage
ALTER TABLE coupons 
ADD COLUMN description TEXT,
ADD COLUMN usage_limit_per_user INTEGER,
ADD COLUMN first_purchase_only BOOLEAN DEFAULT false,
ADD COLUMN exclude_sale_items BOOLEAN DEFAULT false,
ADD COLUMN applicable_categories TEXT[],
ADD COLUMN applicable_products TEXT[];

-- Add comment for documentation
COMMENT ON COLUMN coupons.description IS 'User-facing description of the coupon';
COMMENT ON COLUMN coupons.usage_limit_per_user IS 'Maximum uses per user (null = unlimited)';
COMMENT ON COLUMN coupons.first_purchase_only IS 'Only valid for first-time customers';
COMMENT ON COLUMN coupons.exclude_sale_items IS 'Cannot be used on sale items';
COMMENT ON COLUMN coupons.applicable_categories IS 'Array of category IDs this coupon applies to (null = all)';
COMMENT ON COLUMN coupons.applicable_products IS 'Array of product IDs this coupon applies to (null = all)';