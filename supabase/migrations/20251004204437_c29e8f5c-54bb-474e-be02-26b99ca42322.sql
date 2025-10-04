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