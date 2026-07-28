-- Migration: Add farmer payout cancellation reasons to orders
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS farmer_payout_cancel_reason TEXT;
