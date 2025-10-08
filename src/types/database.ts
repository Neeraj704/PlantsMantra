export type ProductStatus = 'active' | 'archived' | 'draft';
export type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
export type StockStatus = 'in_stock' | 'low_stock' | 'out_of_stock';

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  created_at: string;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  botanical_name: string | null;
  description: string | null;
  care_guide: string | null;
  category_id: string | null;
  main_image_url: string | null;
  gallery_images: string[] | null;
  main_image_alt: string | null;
  gallery_alt_texts: string[] | null; 
  seo_title: string | null;
  meta_description: string | null;
  base_price: number;
  sale_price: number | null;
  stock_status: StockStatus;
  status: ProductStatus;
  is_featured: boolean;
  tags: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  name: string;
  sku: string | null;
  price_adjustment: number;
  stock_quantity: number;
  image_url: string | null;
  image_alt: string | null; 
  created_at: string;
}

export interface Coupon {
  id: string;
  code: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  min_purchase: number;
  max_uses: number | null;
  used_count: number;
  valid_from: string;
  valid_until: string | null;
  is_active: boolean;
  created_at: string;
}

export interface CartItem {
  product: Product;
  variant?: ProductVariant;
  quantity: number;
}

export interface Order {
  id: string;
  user_id: string | null;
  customer_email: string;
  customer_name: string;
  customer_phone: string | null;
  shipping_address: any;
  subtotal: number;
  discount_amount: number;
  shipping_cost: number;
  payment_method: 'stripe' | 'razorpay' | 'cod';
  total: number;
  coupon_code: string | null;
  status: OrderStatus;
  tracking_number: string | null;
  payment_intent_id: string | null;
  payment_status: string | null;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Address {
  id: string;
  user_id: string;
  full_name: string;
  phone: string;
  address_line1: string;
  address_line2: string | null;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export type AppRole = 'admin' | 'user';
