-- Add Shiprocket-specific columns to orders table
-- Existing Delhivery columns (awb, courier, label_url, shipment_status, 
-- delhivery_response, shipment_created_at, shipment_cancelled_at) are PRESERVED
-- for backward compatibility with in-flight Delhivery orders.

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS shiprocket_order_id TEXT,
  ADD COLUMN IF NOT EXISTS shiprocket_shipment_id TEXT,
  ADD COLUMN IF NOT EXISTS shiprocket_channel_id INTEGER,
  ADD COLUMN IF NOT EXISTS shiprocket_awb TEXT,
  ADD COLUMN IF NOT EXISTS shiprocket_courier_name TEXT,
  ADD COLUMN IF NOT EXISTS shiprocket_label_url TEXT,
  ADD COLUMN IF NOT EXISTS shiprocket_tracking_url TEXT,
  ADD COLUMN IF NOT EXISTS shiprocket_response JSONB,
  ADD COLUMN IF NOT EXISTS shiprocket_created_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS shiprocket_cancelled_at TIMESTAMP WITH TIME ZONE;

-- Index for quick AWB lookups
CREATE INDEX IF NOT EXISTS orders_shiprocket_awb_idx ON public.orders(shiprocket_awb);
CREATE INDEX IF NOT EXISTS orders_shiprocket_order_id_idx ON public.orders(shiprocket_order_id);

COMMENT ON COLUMN public.orders.shiprocket_order_id IS 'Shiprocket internal order ID returned on order creation';
COMMENT ON COLUMN public.orders.shiprocket_shipment_id IS 'Shiprocket shipment ID (used for label/tracking)';
COMMENT ON COLUMN public.orders.shiprocket_awb IS 'AWB number assigned by Shiprocket after courier assignment';
COMMENT ON COLUMN public.orders.shiprocket_courier_name IS 'Courier partner name assigned by Shiprocket (e.g. Delhivery, Ekart)';
COMMENT ON COLUMN public.orders.shiprocket_label_url IS 'Direct PDF label URL from Shiprocket';
COMMENT ON COLUMN public.orders.shiprocket_tracking_url IS 'Public tracking URL';

CREATE TABLE IF NOT EXISTS public.app_secrets (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  expires_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS: no public access, edge functions use service_role key
ALTER TABLE public.app_secrets ENABLE ROW LEVEL SECURITY;
-- No SELECT policy = only service_role can access
