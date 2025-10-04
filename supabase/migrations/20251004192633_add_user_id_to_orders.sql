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