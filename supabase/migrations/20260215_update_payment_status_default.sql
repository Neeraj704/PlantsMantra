
ALTER TABLE orders ALTER COLUMN payment_status SET DEFAULT 'checking';
UPDATE orders SET payment_status = 'checking';
