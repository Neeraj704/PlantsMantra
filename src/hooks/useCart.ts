import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CartItem, Product, ProductVariant } from '@/types/database';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface CartStore {
  items: CartItem[];
  isInitialized: boolean;
  addItem: (product: Product, variant?: ProductVariant, quantity?: number) => void;
  removeItem: (productId: string, variantId?: string) => void;
  updateQuantity: (productId: string, quantity: number, variantId?: string) => void;
  clearCart: () => void;
  getTotal: () => number;
  getSubtotal: () => number;
  syncWithDatabase: (userId: string) => Promise<void>;
  loadFromDatabase: (userId: string) => Promise<void>;
  setInitialized: (value: boolean) => void;
}

export const useCart = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      isInitialized: false,

      setInitialized: (value) => set({ isInitialized: value }),

      loadFromDatabase: async (userId: string) => {
        try {
          const { data: cartItems, error } = await supabase
            .from('cart_items')
            .select(`
              id,
              quantity,
              product_id,
              variant_id,
              products (
                id,
                name,
                slug,
                base_price,
                sale_price,
                main_image_url,
                description,
                botanical_name,
                care_guide,
                category_id,
                status,
                stock_status,
                is_featured,
                tags,
                gallery_images,
                created_at,
                updated_at
              ),
              product_variants (
                id,
                name,
                price_adjustment,
                sku,
                stock_quantity,
                image_url,
                product_id,
                created_at
              )
            `)
            .eq('user_id', userId);

          if (error) throw error;

          const items: CartItem[] = (cartItems || []).map((item: any) => ({
            product: item.products,
            variant: item.product_variants || undefined,
            quantity: item.quantity,
          }));

          set({ items, isInitialized: true });
        } catch (error) {
          console.error('Error loading cart from database:', error);
          set({ isInitialized: true });
        }
      },

      syncWithDatabase: async (userId: string) => {
        const localItems = get().items;
        
        try {
          // Fetch existing cart items from database
          const { data: dbItems } = await supabase
            .from('cart_items')
            .select('*')
            .eq('user_id', userId);

          // Merge local items with database items
          for (const localItem of localItems) {
            const existingItem = dbItems?.find(
              (db: any) =>
                db.product_id === localItem.product.id &&
                db.variant_id === localItem.variant?.id
            );

            if (existingItem) {
              // Update quantity (add local to existing)
              await supabase
                .from('cart_items')
                .update({ quantity: existingItem.quantity + localItem.quantity })
                .eq('id', existingItem.id);
            } else {
              // Insert new item
              await supabase.from('cart_items').insert({
                user_id: userId,
                product_id: localItem.product.id,
                variant_id: localItem.variant?.id || null,
                quantity: localItem.quantity,
              });
            }
          }

          // Reload cart from database
          await get().loadFromDatabase(userId);
        } catch (error) {
          console.error('Error syncing cart with database:', error);
        }
      },

      addItem: async (product, variant, quantity = 1) => {
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
          // Add to database for logged-in users
          try {
            const { data: existing } = await supabase
              .from('cart_items')
              .select('*')
              .eq('user_id', user.id)
              .eq('product_id', product.id)
              .eq('variant_id', variant?.id || null)
              .maybeSingle();

            if (existing) {
              await supabase
                .from('cart_items')
                .update({ quantity: existing.quantity + quantity })
                .eq('id', existing.id);
              toast.success('Updated cart quantity');
            } else {
              await supabase.from('cart_items').insert({
                user_id: user.id,
                product_id: product.id,
                variant_id: variant?.id || null,
                quantity,
              });
              toast.success('Added to cart');
            }

            // Reload from database
            await get().loadFromDatabase(user.id);
          } catch (error) {
            console.error('Error adding to cart:', error);
            toast.error('Failed to add to cart');
          }
        } else {
          // Add to local storage for guests
          set((state) => {
            const existingItemIndex = state.items.findIndex(
              (item) =>
                item.product.id === product.id &&
                item.variant?.id === variant?.id
            );

            if (existingItemIndex > -1) {
              const newItems = [...state.items];
              newItems[existingItemIndex].quantity += quantity;
              toast.success('Updated cart quantity');
              return { items: newItems };
            }

            toast.success('Added to cart');
            return {
              items: [...state.items, { product, variant, quantity }],
            };
          });
        }
      },

      removeItem: async (productId, variantId) => {
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
          // Remove from database
          try {
            await supabase
              .from('cart_items')
              .delete()
              .eq('user_id', user.id)
              .eq('product_id', productId)
              .eq('variant_id', variantId || null);

            await get().loadFromDatabase(user.id);
            toast.success('Removed from cart');
          } catch (error) {
            console.error('Error removing from cart:', error);
            toast.error('Failed to remove from cart');
          }
        } else {
          // Remove from local storage
          set((state) => ({
            items: state.items.filter(
              (item) =>
                !(item.product.id === productId && item.variant?.id === variantId)
            ),
          }));
          toast.success('Removed from cart');
        }
      },

      updateQuantity: async (productId, quantity, variantId) => {
        if (quantity <= 0) {
          get().removeItem(productId, variantId);
          return;
        }

        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
          // Update in database
          try {
            await supabase
              .from('cart_items')
              .update({ quantity })
              .eq('user_id', user.id)
              .eq('product_id', productId)
              .eq('variant_id', variantId || null);

            await get().loadFromDatabase(user.id);
          } catch (error) {
            console.error('Error updating quantity:', error);
            toast.error('Failed to update quantity');
          }
        } else {
          // Update in local storage
          set((state) => ({
            items: state.items.map((item) =>
              item.product.id === productId && item.variant?.id === variantId
                ? { ...item, quantity }
                : item
            ),
          }));
        }
      },

      clearCart: async () => {
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
          // Clear from database
          try {
            await supabase
              .from('cart_items')
              .delete()
              .eq('user_id', user.id);

            set({ items: [] });
            toast.success('Cart cleared');
          } catch (error) {
            console.error('Error clearing cart:', error);
            toast.error('Failed to clear cart');
          }
        } else {
          // Clear from local storage
          set({ items: [] });
          toast.success('Cart cleared');
        }
      },

      getSubtotal: () => {
        return get().items.reduce((total, item) => {
          const price = item.product.sale_price || item.product.base_price;
          const variantAdjustment = item.variant?.price_adjustment || 0;
          return total + (price + variantAdjustment) * item.quantity;
        }, 0);
      },

      getTotal: () => {
        return get().getSubtotal();
      },
    }),
    {
      name: 'verdant-cart',
    }
  )
);
