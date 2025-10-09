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