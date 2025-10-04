-- Create enum types
CREATE TYPE product_status AS ENUM ('active', 'archived', 'draft');
CREATE TYPE order_status AS ENUM ('pending', 'processing', 'shipped', 'delivered', 'cancelled');
CREATE TYPE stock_status AS ENUM ('in_stock', 'low_stock', 'out_of_stock');

-- Categories table
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Products table
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  botanical_name TEXT,
  description TEXT,
  care_guide TEXT,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  main_image_url TEXT,
  gallery_images TEXT[],
  base_price DECIMAL(10,2) NOT NULL,
  sale_price DECIMAL(10,2),
  stock_status stock_status DEFAULT 'in_stock',
  status product_status DEFAULT 'active',
  is_featured BOOLEAN DEFAULT false,
  tags TEXT[],
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Product variants table (sizes, pot options)
CREATE TABLE product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  sku TEXT UNIQUE,
  price_adjustment DECIMAL(10,2) DEFAULT 0,
  stock_quantity INTEGER DEFAULT 0,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Coupons table
CREATE TABLE coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value DECIMAL(10,2) NOT NULL,
  min_purchase DECIMAL(10,2) DEFAULT 0,
  max_uses INTEGER,
  used_count INTEGER DEFAULT 0,
  valid_from TIMESTAMPTZ DEFAULT now(),
  valid_until TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Orders table
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_email TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  shipping_address JSONB NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL,
  discount_amount DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) NOT NULL,
  coupon_code TEXT,
  status order_status DEFAULT 'pending',
  tracking_number TEXT,
  payment_intent_id TEXT,
  payment_status TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Order items table
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  variant_name TEXT,
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Public read policies for storefront
CREATE POLICY "Categories are publicly readable" ON categories FOR SELECT USING (true);
CREATE POLICY "Active products are publicly readable" ON products FOR SELECT USING (status = 'active');
CREATE POLICY "Product variants are publicly readable" ON product_variants FOR SELECT USING (true);
CREATE POLICY "Active coupons are publicly readable" ON coupons FOR SELECT USING (is_active = true);

-- Orders readable by customer email (for now - will improve with auth)
CREATE POLICY "Orders readable by customer" ON orders FOR SELECT USING (true);
CREATE POLICY "Order items readable by anyone" ON order_items FOR SELECT USING (true);

-- Insert trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample categories
INSERT INTO categories (name, slug, description) VALUES
('Low Light', 'low-light', 'Perfect for dimly lit rooms and offices'),
('Pet Friendly', 'pet-friendly', 'Safe for cats and dogs'),
('Air Purifying', 'air-purifying', 'Clean your air naturally'),
('Flowering', 'flowering', 'Beautiful blooms year-round'),
('Easy Care', 'easy-care', 'Perfect for beginners'),
('Succulents', 'succulents', 'Low maintenance desert beauties');

-- Insert sample products
INSERT INTO products (name, slug, botanical_name, description, care_guide, category_id, base_price, sale_price, is_featured, tags, stock_status) 
SELECT 
  'Monstera Deliciosa', 
  'monstera-deliciosa',
  'Monstera deliciosa',
  'The Swiss Cheese Plant is a stunning tropical vine with iconic split leaves. Perfect for creating that jungle vibe in your home.',
  'Light: Bright indirect light. Water: When top 2 inches of soil are dry. Humidity: Moderate to high.',
  id,
  49.99,
  39.99,
  true,
  ARRAY['tropical', 'statement', 'bestseller'],
  'in_stock'
FROM categories WHERE slug = 'easy-care'
LIMIT 1;

INSERT INTO products (name, slug, botanical_name, description, care_guide, category_id, base_price, is_featured, tags, stock_status) 
SELECT 
  'Snake Plant', 
  'snake-plant',
  'Sansevieria trifasciata',
  'Nearly indestructible and perfect for beginners. This architectural beauty thrives on neglect and purifies your air.',
  'Light: Low to bright indirect. Water: Every 2-3 weeks. Very drought tolerant.',
  id,
  29.99,
  true,
  ARRAY['easy-care', 'air-purifying', 'bestseller'],
  'in_stock'
FROM categories WHERE slug = 'low-light'
LIMIT 1;

INSERT INTO products (name, slug, botanical_name, description, care_guide, category_id, base_price, tags, stock_status) 
SELECT 
  'Pothos', 
  'pothos',
  'Epipremnum aureum',
  'The ultimate low-maintenance trailing plant. Beautiful cascading vines that grow in almost any condition.',
  'Light: Low to bright indirect. Water: When soil is dry. Very forgiving.',
  id,
  24.99,
  ARRAY['trailing', 'easy-care', 'air-purifying'],
  'in_stock'
FROM categories WHERE slug = 'pet-friendly'
LIMIT 1;

INSERT INTO products (name, slug, botanical_name, description, care_guide, category_id, base_price, sale_price, tags, stock_status) 
SELECT 
  'Fiddle Leaf Fig', 
  'fiddle-leaf-fig',
  'Ficus lyrata',
  'The Instagram famous statement plant. Large, violin-shaped leaves create a dramatic focal point in any room.',
  'Light: Bright indirect light. Water: When top inch is dry. Wipe leaves monthly.',
  id,
  89.99,
  79.99,
  ARRAY['statement', 'tropical', 'trending'],
  'low_stock'
FROM categories WHERE slug = 'air-purifying'
LIMIT 1;