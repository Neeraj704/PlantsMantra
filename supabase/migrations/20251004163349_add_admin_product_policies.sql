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