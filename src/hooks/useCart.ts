import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CartItem, Product, ProductVariant } from '@/types/database';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

// Define the structure for applied coupon
interface AppliedCoupon {
  code: string;
  discountAmount: number;
  min_purchase?: number;
}

interface CartStore {
  items: CartItem[];
  isInitialized: boolean;
  appliedCoupon: AppliedCoupon | null;
  shippingCost: number;
  addItem: (product: Product, variant?: ProductVariant, quantity?: number) => void;
  removeItem: (productId: string, variantId?: string) => void;
  updateQuantity: (productId: string, quantity: number, variantId?: string) => void;
  clearCart: () => void;
  getSubtotal: () => number;
  getShippingCost: () => number;
  getDiscountAmount: () => number;
  getTotal: () => number;
  applyCoupon: (coupon: AppliedCoupon) => void;
  removeCoupon: () => void;
  syncWithDatabase: (userId: string) => Promise<void>;
  loadFromDatabase: (userId: string) => Promise<void>;
  setInitialized: (value: boolean) => void;
}

const FREE_SHIPPING_THRESHOLD = 799;
const DELIVERY_CHARGE = 99;

export const useCart = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      isInitialized: false,
      appliedCoupon: null,
      shippingCost: 0,

      setInitialized: (value) => set({ isInitialized: value }),

      applyCoupon: (coupon) => set({ appliedCoupon: coupon }),
      removeCoupon: () => set({ appliedCoupon: null }),

      loadFromDatabase: async (userId: string) => {
        try {
          const { data: cartItems, error } = await supabase
            .from('cart_items')
            .select(
              `
              id,
              quantity,
              product_id,
              variant_id,
              products (*),
              product_variants (*)
            `
            )
            .eq('user_id', userId);

          if (error) throw error;

          const items: CartItem[] = (cartItems || []).map((item: any) => ({
            product: item.products,
            variant: item.product_variants || undefined,
            quantity: item.quantity,
          }));

          set({ items, isInitialized: true, appliedCoupon: null, shippingCost: 0 });
        } catch (error) {
          console.error('Error loading cart from database:', error);
          set({ isInitialized: true });
        }
      },

      syncWithDatabase: async (userId: string) => {
        const localItems = get().items;
        if (localItems.length === 0) {
          await get().loadFromDatabase(userId);
          return;
        }

        try {
          const { data: dbItems } = await supabase.from('cart_items').select('*').eq('user_id', userId);

          for (const localItem of localItems) {
            const existingItem = dbItems?.find(
              (db: any) =>
                db.product_id === localItem.product.id &&
                (db.variant_id || null) === (localItem.variant?.id || null)
            );

            if (existingItem) {
              await supabase
                .from('cart_items')
                .update({ quantity: existingItem.quantity + localItem.quantity })
                .eq('id', existingItem.id);
            } else {
              await supabase.from('cart_items').insert({
                user_id: userId,
                product_id: localItem.product.id,
                variant_id: localItem.variant?.id || null,
                quantity: localItem.quantity,
              });
            }
          }

          await get().loadFromDatabase(userId);
        } catch (error) {
          console.error('Error syncing cart with database:', error);
        }
      },

      addItem: async (product, variant, quantity = 1) => {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          try {
            let query = supabase
              .from('cart_items')
              .select('*')
              .eq('user_id', user.id)
              .eq('product_id', product.id);

            if (variant?.id) {
              query = query.eq('variant_id', variant.id);
            } else {
              query = query.is('variant_id', null);
            }

            const { data: existing } = await query.maybeSingle();

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
            await get().loadFromDatabase(user.id);
          } catch (error) {
            console.error('Error adding to cart:', error);
            toast.error('Failed to add to cart');
          }
        } else {
          set((state) => {
            const existingItemIndex = state.items.findIndex(
              (item) =>
                item.product.id === product.id && (item.variant?.id || null) === (variant?.id || null)
            );

            let newItems = [...state.items];
            if (existingItemIndex > -1) {
              newItems[existingItemIndex].quantity += quantity;
              toast.success('Updated cart quantity');
            } else {
              newItems = [...state.items, { product, variant, quantity }];
              toast.success('Added to cart');
            }
            return { items: newItems };
          });
        }
      },

      removeItem: async (productId, variantId) => {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          try {
            let query = supabase
              .from('cart_items')
              .delete()
              .eq('user_id', user.id)
              .eq('product_id', productId);

            if (variantId) {
              query = query.eq('variant_id', variantId);
            } else {
              query = query.is('variant_id', null);
            }

            const { error } = await query;
            if (error) throw error;

            await get().loadFromDatabase(user.id);
            toast.success('Removed from cart');
          } catch (error) {
            console.error('Error removing from cart:', error);
            toast.error('Failed to remove from cart');
          }
        } else {
          set((state) => {
            const newItems = state.items.filter(
              (item) =>
                !(
                  item.product.id === productId && (item.variant?.id || null) === (variantId || null)
                )
            );
            toast.success('Removed from cart');
            return { items: newItems };
          });
        }
      },

      updateQuantity: async (productId, quantity, variantId) => {
        if (quantity <= 0) {
          get().removeItem(productId, variantId);
          return;
        }

        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          try {
            let query = supabase
              .from('cart_items')
              .update({ quantity })
              .eq('user_id', user.id)
              .eq('product_id', productId);

            if (variantId) {
              query = query.eq('variant_id', variantId);
            } else {
              query = query.is('variant_id', null);
            }

            const { error } = await query;
            if (error) throw error;

            await get().loadFromDatabase(user.id);
          } catch (error) {
            console.error('Error updating quantity:', error);
            toast.error('Failed to update quantity');
          }
        } else {
          set((state) => {
            const newItems = state.items.map((item) =>
              item.product.id === productId && (item.variant?.id || null) === (variantId || null)
                ? { ...item, quantity }
                : item
            );
            return { items: newItems };
          });
        }
      },

      clearCart: async () => {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          try {
            await supabase.from('cart_items').delete().eq('user_id', user.id);

            set({ items: [], appliedCoupon: null, shippingCost: 0 });
            toast.success('Cart cleared');
          } catch (error) {
            console.error('Error clearing cart:', error);
            toast.error('Failed to clear cart');
          }
        } else {
          set({ items: [], appliedCoupon: null, shippingCost: 0 });
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

      getShippingCost: () => {
        const subtotal = get().getSubtotal();
        return subtotal < FREE_SHIPPING_THRESHOLD && subtotal > 0 ? DELIVERY_CHARGE : 0;
      },

      getDiscountAmount: () => {
        const subtotal = get().getSubtotal();
        const appliedCoupon = get().appliedCoupon;
        const minPurchase = appliedCoupon?.min_purchase || 0;

        if (appliedCoupon && subtotal >= minPurchase) {
          return appliedCoupon.discountAmount;
        }
        return 0;
      },

      getTotal: () => {
        const subtotal = get().getSubtotal();
        const shipping = get().getShippingCost();
        const discount = get().getDiscountAmount();
        return Math.max(0, subtotal + shipping - discount);
      },
    }),
    {
      name: 'plantsmantra-cart',
    }
  )
);