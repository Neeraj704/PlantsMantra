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