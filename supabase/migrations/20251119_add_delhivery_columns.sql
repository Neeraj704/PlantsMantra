-- Add Delhivery-related columns to orders table
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS awb TEXT,
  ADD COLUMN IF NOT EXISTS courier TEXT,
  ADD COLUMN IF NOT EXISTS label_url TEXT,
  ADD COLUMN IF NOT EXISTS shipment_status TEXT,
  ADD COLUMN IF NOT EXISTS delhivery_response JSONB,
  ADD COLUMN IF NOT EXISTS shipment_created_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS shipment_cancelled_at TIMESTAMP WITH TIME ZONE;