-- Add order cancellation tracking
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;

-- Add comment for clarity
COMMENT ON COLUMN orders.cancelled_at IS 'Timestamp when order was cancelled by user';
COMMENT ON COLUMN orders.cancellation_reason IS 'Optional reason for cancellation provided by user';