-- Adds payment_method and shipping_cost columns to the orders table

ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS payment_method TEXT,
ADD COLUMN IF NOT EXISTS shipping_cost DECIMAL(10, 2) DEFAULT 0;

-- Add comments for clarity
COMMENT ON COLUMN public.orders.payment_method IS 'The payment gateway used (e.g., stripe, razorpay, cod).';
COMMENT ON COLUMN public.orders.shipping_cost IS 'The calculated cost of shipping for the order.';