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