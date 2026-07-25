-- Migration: Add sales campaign and product scarcity fields
-- 1. Add scarcity fields to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS scarcity_status TEXT DEFAULT 'none' CHECK (scarcity_status IN ('none', 'limited_stock', 'sold_out'));
ALTER TABLE products ADD COLUMN IF NOT EXISTS scarcity_value INTEGER DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_b1g1 BOOLEAN DEFAULT false;

-- 2. Create campaign_settings table
CREATE TABLE IF NOT EXISTS campaign_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_name TEXT NOT NULL,
  banner_text TEXT NOT NULL,
  is_active BOOLEAN DEFAULT false,
  end_type TEXT DEFAULT 'manual', -- 'manual' or 'timer'
  end_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. Insert default row if empty
INSERT INTO campaign_settings (id, campaign_name, banner_text, is_active, end_type)
VALUES ('00000000-0000-0000-0000-000000000001', 'B1G1', 'Buy 1 Get 1 Free on all indoor plants!', false, 'manual')
ON CONFLICT (id) DO NOTHING;

-- 4. Enable Row Level Security (RLS) on campaign_settings
ALTER TABLE campaign_settings ENABLE ROW LEVEL SECURITY;

-- 5. Create policies for campaign_settings
CREATE POLICY "Allow public read access to campaign_settings" ON campaign_settings
  FOR SELECT USING (true);

CREATE POLICY "Allow admin write access to campaign_settings" ON campaign_settings
  FOR ALL USING (true); -- We will authenticate this in the client

-- 6. Trigger to automatically decrement scarcity_value when order is placed
CREATE OR REPLACE FUNCTION decrement_product_sale_stock()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE products
  SET scarcity_value = GREATEST(0, scarcity_value - NEW.quantity)
  WHERE id = NEW.product_id AND scarcity_status = 'limited_stock';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trigger_decrement_product_sale_stock
  AFTER INSERT ON order_items
  FOR EACH ROW
  EXECUTE FUNCTION decrement_product_sale_stock();
