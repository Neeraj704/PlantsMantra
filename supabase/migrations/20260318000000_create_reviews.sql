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
