-- Add max_discount_amount to coupons table
ALTER TABLE coupons
ADD COLUMN max_discount_amount numeric DEFAULT NULL;