-- ====================================
-- Migration: 20251004094410_4bf5ea3f-3a4e-4b58-be06-7deb956db9e4.sql
-- ====================================
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

-- ====================================
-- Migration: 20251004094436_2d012c28-b202-414d-99ec-5f9f82451dd5.sql
-- ====================================
-- Fix search_path security issue by replacing the function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ====================================
-- Migration: 20251004143144_07a694fb-c85c-4f50-a64a-081d6d9b913e.sql
-- ====================================
-- Create cart_items table for persistent cart storage
CREATE TABLE public.cart_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  variant_id uuid REFERENCES public.product_variants(id) ON DELETE CASCADE,
  quantity integer NOT NULL DEFAULT 1,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, product_id, variant_id)
);

-- Enable Row Level Security
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;

-- Users can only access their own cart items
CREATE POLICY "Users can view their own cart items"
ON public.cart_items
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own cart items"
ON public.cart_items
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own cart items"
ON public.cart_items
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own cart items"
ON public.cart_items
FOR DELETE
USING (auth.uid() = user_id);

-- Trigger for automatic timestamp updates
CREATE TRIGGER update_cart_items_updated_at
BEFORE UPDATE ON public.cart_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- ====================================
-- Migration: 20251004144111_e5181b9e-6403-4f2b-a702-b2236ff6e286.sql
-- ====================================
-- Create enum for roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Policy: Users can view their own roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Policy: Only admins can insert roles
CREATE POLICY "Only admins can insert roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Policy: Only admins can update roles
CREATE POLICY "Only admins can update roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Policy: Only admins can delete roles
CREATE POLICY "Only admins can delete roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- ====================================
-- Migration: 20251004161541_ac8beb5d-e80c-40c8-9616-5eccc98fa2b7.sql
-- ====================================
-- Create storage bucket for product images
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true);

-- Create RLS policies for product images bucket
CREATE POLICY "Admins can upload product images"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'product-images' AND
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admins can update product images"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'product-images' AND
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admins can delete product images"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'product-images' AND
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Product images are publicly readable"
ON storage.objects
FOR SELECT
USING (bucket_id = 'product-images');

-- ====================================
-- Migration: 20251004163349_add_admin_product_policies.sql
-- ====================================
-- 1. Allow admins to view ALL products (not just 'active' ones)
CREATE POLICY "Admins can view all products"
ON public.products
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 2. Allow admins to insert new products
CREATE POLICY "Admins can insert products"
ON public.products
FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 3. Allow admins to update any product
CREATE POLICY "Admins can update products"
ON public.products
FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 4. Allow admins to delete products
CREATE POLICY "Admins can delete products"
ON public.products
FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- ====================================
-- Migration: 20251004191537_create_addresses_table.sql
-- ====================================
-- Create table for user addresses
CREATE TABLE public.addresses (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name text NOT NULL,
    phone text NOT NULL,
    address_line1 text NOT NULL,
    address_line2 text,
    city text NOT NULL,
    state text NOT NULL,
    postal_code text NOT NULL,
    country text NOT NULL DEFAULT 'India',
    is_default boolean NOT NULL DEFAULT false,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Apply automatic update timestamp trigger
CREATE TRIGGER update_addresses_updated_at
BEFORE UPDATE ON public.addresses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only manage their own addresses
CREATE POLICY "Users can view their own addresses"
ON public.addresses
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own addresses"
ON public.addresses
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own addresses"
ON public.addresses
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own addresses"
ON public.addresses
FOR DELETE
USING (auth.uid() = user_id);

-- ====================================
-- Migration: 20251004192633_add_user_id_to_orders.sql
-- ====================================
-- Add the user_id column to the orders table
ALTER TABLE public.orders
ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Since orders are typically linked to a user, it's good practice to allow the user to view their own orders.
-- This RLS policy allows authenticated users to read their own orders.
CREATE POLICY "Users can view their own orders"
ON public.orders
FOR SELECT
USING (auth.uid() = user_id);

-- Note: Admins can still view all orders via the existing admin policy if you correctly fixed the RLS in the previous steps.

-- ====================================
-- Migration: 20251004192833_add_order_insert_policy.sql
-- ====================================
-- Allow authenticated users to insert orders only if they are for themselves
CREATE POLICY "Users can insert their own orders"
ON public.orders
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- ====================================
-- Migration: 20251004193037_add_order_items_insert_policy.sql
-- ====================================
-- Allow authenticated users to insert order_items only for orders they own.
CREATE POLICY "Users can insert order items for their orders"
ON public.order_items
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.orders
        WHERE orders.id = order_items.order_id
        AND orders.user_id = auth.uid()
    )
);

-- Note: Reviewing the schema, public.order_items already has some default SELECT/DELETE policies, 
-- but this new INSERT policy is necessary to complete the checkout flow.

-- ====================================
-- Migration: 20251004203033_4122a647-7fe4-4d68-bb63-c0d01989ab01.sql
-- ====================================
-- Add order cancellation tracking
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;

-- Add comment for clarity
COMMENT ON COLUMN orders.cancelled_at IS 'Timestamp when order was cancelled by user';
COMMENT ON COLUMN orders.cancellation_reason IS 'Optional reason for cancellation provided by user';

-- ====================================
-- Migration: 20251004204437_c29e8f5c-54bb-474e-be02-26b99ca42322.sql
-- ====================================
-- Fix coupon RLS policies for admin management
-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Admins can manage coupons" ON public.coupons;

-- Allow admins to insert coupons
CREATE POLICY "Admins can insert coupons" 
ON public.coupons 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Allow admins to update coupons
CREATE POLICY "Admins can update coupons" 
ON public.coupons 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'));

-- Allow admins to delete coupons
CREATE POLICY "Admins can delete coupons" 
ON public.coupons 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'));

-- Fix orders RLS policy for admin updates
DROP POLICY IF EXISTS "Admins can update orders" ON public.orders;

CREATE POLICY "Admins can update orders" 
ON public.orders 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'));

-- ====================================
-- Migration: 20251004210245_83133276-ac57-4cb6-9f56-c0f90d669325.sql
-- ====================================
-- Create wishlist table
CREATE TABLE public.wishlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, product_id)
);

-- Enable RLS
ALTER TABLE public.wishlist ENABLE ROW LEVEL SECURITY;

-- RLS Policies for wishlist
CREATE POLICY "Users can view their own wishlist"
  ON public.wishlist
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can add to their wishlist"
  ON public.wishlist
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove from their wishlist"
  ON public.wishlist
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create contact submissions table
CREATE TABLE public.contact_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.contact_submissions ENABLE ROW LEVEL SECURITY;

-- Anyone can submit (no need to be logged in)
CREATE POLICY "Anyone can submit contact form"
  ON public.contact_submissions
  FOR INSERT
  WITH CHECK (true);

-- Only admins can view submissions
CREATE POLICY "Admins can view contact submissions"
  ON public.contact_submissions
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

-- ====================================
-- Migration: 20251005204017_create_profiles_table.sql
-- ====================================
-- supabase/migrations/YYYYMMDDHHMMSS_create_profiles_table.sql

-- 1. Create the profiles table
CREATE TABLE public.profiles (
  id uuid NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  phone text,
  avatar_url text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 2. Add comments for clarity
COMMENT ON TABLE public.profiles IS 'Stores public profile information for each user.';
COMMENT ON COLUMN public.profiles.id IS 'References the internal auth.users id.';

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS policies for the profiles table
-- Users can view their own profile
CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- 5. Create a trigger function to automatically create a profile on new user sign-up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone, avatar_url)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.raw_user_meta_data ->> 'phone',
    NEW.raw_user_meta_data ->> 'avatar_url'
  );
  RETURN NEW;
END;
$$;

-- 6. Attach the trigger to the auth.users table
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 7. Add a trigger to update the updated_at timestamp on profile changes
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- ====================================
-- Migration: 20251005205236_add_payment_details_to_orders.sql
-- ====================================
-- Adds payment_method and shipping_cost columns to the orders table

ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS payment_method TEXT,
ADD COLUMN IF NOT EXISTS shipping_cost DECIMAL(10, 2) DEFAULT 0;

-- Add comments for clarity
COMMENT ON COLUMN public.orders.payment_method IS 'The payment gateway used (e.g., stripe, razorpay, cod).';
COMMENT ON COLUMN public.orders.shipping_cost IS 'The calculated cost of shipping for the order.';

-- ====================================
-- Migration: 20251008220551_add_seo_fields_to_products.sql
-- ====================================
-- supabase/migrations/20251009000000_add_seo_fields_to_products.sql

-- Add SEO-specific columns to the products table.
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS seo_title TEXT,
ADD COLUMN IF NOT EXISTS meta_description TEXT;

-- Update the RLS policy for 'products' to allow admins to write to the new columns.
-- Since the existing "Admins can update products" policy is FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')),
-- it should automatically cover the new columns. However, it's good practice to ensure
-- the RLS allows it explicitly.
-- Note: Supabase RLS is permissive by default for columns on an allowed row UPDATE.

-- ====================================
-- Migration: 20251008223039_add_alt_text_fields.sql
-- ====================================
-- supabase/migrations/20251009000001_add_alt_text_fields.sql

-- 1. Add alt_text columns to the products table
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS main_image_alt TEXT,
ADD COLUMN IF NOT EXISTS gallery_alt_texts TEXT[];

-- 2. Add alt_text column to the product_variants table (for completeness)
ALTER TABLE public.product_variants
ADD COLUMN IF NOT EXISTS image_alt TEXT;

-- ====================================
-- Migration: 20251009132015_24052031-6c18-46b9-9250-4f17a59643bc.sql
-- ====================================
-- Add RLS policies for admins to manage categories
CREATE POLICY "Admins can insert categories"
ON public.categories
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update categories"
ON public.categories
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete categories"
ON public.categories
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- Insert the 4 main categories
INSERT INTO public.categories (name, slug, description, image_url) VALUES
('Succulent', 'succulent', 'Beautiful succulent plants perfect for any space', NULL),
('Cactus', 'cactus', 'Hardy cactus plants that thrive with minimal care', NULL),
('Snake Plants', 'snake', 'Low-maintenance snake plants ideal for beginners', NULL),
('Indoor Plants', 'indoor-plants', 'Lush indoor plants to bring nature inside', NULL)
ON CONFLICT (slug) DO NOTHING;

-- ====================================
-- Migration: 20251012185904_e6db3059-c8bd-4fcd-ba2e-9b3d86ad46d1.sql
-- ====================================
-- Create banners storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('banners', 'banners', true);

-- Create banners table
CREATE TABLE public.banners (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  image_url TEXT NOT NULL,
  link_url TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;

-- Policies for banners
CREATE POLICY "Banners are publicly readable"
  ON public.banners FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can insert banners"
  ON public.banners FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update banners"
  ON public.banners FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete banners"
  ON public.banners FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Storage policies for banners bucket
CREATE POLICY "Banner images are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'banners');

CREATE POLICY "Admins can upload banner images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'banners' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update banner images"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'banners' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete banner images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'banners' AND has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_banners_updated_at
  BEFORE UPDATE ON public.banners
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ====================================
-- Migration: 20251012192710_6d1ae4b2-a4d1-4bf8-a7b5-1dd4781d29d5.sql
-- ====================================
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

-- ====================================
-- Migration: 20251012194304_bc941664-f9d4-48e5-a715-695e5596e217.sql
-- ====================================
-- Add max_discount_amount to coupons table
ALTER TABLE coupons
ADD COLUMN max_discount_amount numeric DEFAULT NULL;

-- ====================================
-- Migration: 20251119_add_delhivery_columns.sql
-- ====================================
-- Add Delhivery-related columns to orders table
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS awb TEXT,
  ADD COLUMN IF NOT EXISTS courier TEXT,
  ADD COLUMN IF NOT EXISTS label_url TEXT,
  ADD COLUMN IF NOT EXISTS shipment_status TEXT,
  ADD COLUMN IF NOT EXISTS delhivery_response JSONB,
  ADD COLUMN IF NOT EXISTS shipment_created_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS shipment_cancelled_at TIMESTAMP WITH TIME ZONE;

-- ====================================
-- Migration: 20260213_add_product_priority.sql
-- ====================================
-- Add optional priority column to products table
-- Lower number = higher priority. NULL = no priority (shown last).
ALTER TABLE products ADD COLUMN IF NOT EXISTS priority integer DEFAULT NULL;


-- ====================================
-- Migration: 20260215_update_payment_status_default.sql
-- ====================================

ALTER TABLE orders ALTER COLUMN payment_status SET DEFAULT 'checking';
UPDATE orders SET payment_status = 'checking';


-- ====================================
-- Migration: 20260318000000_create_reviews.sql
-- ====================================
-- supabase/migrations/20260318000000_create_reviews.sql

-- 1. reviews table
CREATE TABLE public.reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewer_name TEXT NOT NULL,
  rating SMALLINT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title TEXT,
  body TEXT NOT NULL,
  is_hidden BOOLEAN NOT NULL DEFAULT false,
  is_admin_created BOOLEAN NOT NULL DEFAULT false,
  verified_purchase BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT reviews_user_product_unique UNIQUE (product_id, user_id)
  -- NOTE: This unique constraint allows NULL user_id (admin reviews) to repeat 
  -- because NULL != NULL in SQL. Admin reviews are unconstrained by this.
);

-- 2. review_images table
CREATE TABLE public.review_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  review_id UUID NOT NULL REFERENCES public.reviews(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  display_order SMALLINT NOT NULL DEFAULT 0
);

-- 3. Storage bucket for review images
INSERT INTO storage.buckets (id, name, public)
VALUES ('review-images', 'review-images', true)
ON CONFLICT DO NOTHING;

-- 4. Enable RLS
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_images ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies: reviews

-- Public can read non-hidden reviews
CREATE POLICY "Public can read visible reviews"
  ON public.reviews FOR SELECT
  USING (is_hidden = false);

-- Admin can read ALL reviews (including hidden)
CREATE POLICY "Admins can read all reviews"
  ON public.reviews FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- Only verified buyers can insert their own review
CREATE POLICY "Verified buyers can insert reviews"
  ON public.reviews FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND is_admin_created = false
    AND EXISTS (
      SELECT 1 FROM public.order_items oi
      JOIN public.orders o ON o.id = oi.order_id
      WHERE o.user_id = auth.uid()
        AND oi.product_id = reviews.product_id
        AND o.status NOT IN ('cancelled', 'pending')
    )
  );

-- Users can update their own non-admin reviews (e.g., edit body/title)
CREATE POLICY "Users can update their own reviews"
  ON public.reviews FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id AND is_admin_created = false)
  WITH CHECK (auth.uid() = user_id AND is_admin_created = false);

-- Admin can insert, update (toggle is_hidden, add admin reviews), delete
CREATE POLICY "Admins can insert reviews"
  ON public.reviews FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update reviews"
  ON public.reviews FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete reviews"
  ON public.reviews FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- 6. RLS Policies: review_images
CREATE POLICY "Public can read review images"
  ON public.review_images FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert review images"
  ON public.review_images FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can manage review images"
  ON public.review_images FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- 7. Storage Policies: review-images bucket
CREATE POLICY "Review images are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'review-images');

CREATE POLICY "Authenticated users can upload review images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'review-images');

CREATE POLICY "Admins can manage review images in storage"
  ON storage.objects FOR ALL
  TO authenticated
  USING (bucket_id = 'review-images' AND has_role(auth.uid(), 'admin'));

-- 8. updated_at trigger on reviews
CREATE TRIGGER update_reviews_updated_at
  BEFORE UPDATE ON public.reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();


-- ====================================
-- Migration: 20260323000000_add_shiprocket_columns.sql
-- ====================================
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


-- ====================================
-- Migration: 20260704_add_combo_product_ids.sql
-- ====================================
-- Add combo_product_ids column to products table to support grouping plant products into bundles
ALTER TABLE products ADD COLUMN IF NOT EXISTS combo_product_ids UUID[];
comment on column products.combo_product_ids is 'Array of product IDs that make up this combo/bundle';


-- ====================================
-- Migration: 20260725_add_sales_and_scarcity.sql
-- ====================================
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


-- ====================================
-- Migration: 20260728_add_payout_cancel_reason.sql
-- ====================================
-- Migration: Add farmer payout cancellation reasons to orders
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS farmer_payout_cancel_reason TEXT;


