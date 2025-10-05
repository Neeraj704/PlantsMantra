import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CartItem, Product, ProductVariant } from '@/types/database';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

// Define the structure for applied coupon
interface AppliedCoupon {
  code: string;
  discountAmount: number;
  // NOTE: Assuming min_purchase might be stored on the coupon object for local validation
  min_purchase?: number; 
}

interface CartStore {
  items: CartItem[];
  isInitialized: boolean;
  appliedCoupon: AppliedCoupon | null; // Added for coupon tracking
  shippingCost: number; // Added for shipping cost (managed by getters/setters)
  addItem: (product: Product, variant?: ProductVariant, quantity?: number) => void;
  removeItem: (productId: string, variantId?: string) => void;
  updateQuantity: (productId: string, quantity: number, variantId?: string) => void;
  clearCart: () => void;
  getSubtotal: () => number;
  getShippingCost: () => number; // New method for shipping cost
  getDiscountAmount: () => number; // New method for discount
  getTotal: () => number;
  applyCoupon: (coupon: AppliedCoupon) => void; // New action
  removeCoupon: () => void; // New action
  syncWithDatabase: (userId: string) => Promise<void>;
  loadFromDatabase: (userId: string) => Promise<void>;
  setInitialized: (value: boolean) => void;
}

// --- Constants for Shipping Logic ---
const FREE_SHIPPING_THRESHOLD = 399; // ₹399
const DELIVERY_CHARGE = 99; // ₹99
// ------------------------------------

export const useCart = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      isInitialized: false,
      appliedCoupon: null, // Default
      shippingCost: 0, // Default

      setInitialized: (value) => set({ isInitialized: value }),

      applyCoupon: (coupon) => set({ appliedCoupon: coupon }),
      removeCoupon: () => set({ appliedCoupon: null }),

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

          // Reset Coupon/Shipping when loading to force a fresh calculation/re-validation in UI
          set({ items, isInitialized: true, appliedCoupon: null, shippingCost: 0 });
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

            // Reload from database, which resets appliedCoupon and shippingCost for safety
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

            let newItems = [...state.items];
            if (existingItemIndex > -1) {
              newItems[existingItemIndex].quantity += quantity;
              toast.success('Updated cart quantity');
            } else {
              newItems = [...state.items, { product, variant, quantity }];
              toast.success('Added to cart');
            }
            
            // Recalculate derived state for local storage persistence
            const newSubtotal = newItems.reduce((total, item) => {
                const price = item.product.sale_price || item.product.base_price;
                const variantAdjustment = item.variant?.price_adjustment || 0;
                return total + (price + variantAdjustment) * item.quantity;
            }, 0);

            const newShippingCost = newSubtotal < FREE_SHIPPING_THRESHOLD ? DELIVERY_CHARGE : 0;
            
            return { 
                items: newItems,
                shippingCost: newShippingCost,
                // appliedCoupon is kept as is, but its validation happens in getDiscountAmount
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

            // Reload from database, which resets appliedCoupon and shippingCost for safety
            await get().loadFromDatabase(user.id);
            toast.success('Removed from cart');
          } catch (error) {
            console.error('Error removing from cart:', error);
            toast.error('Failed to remove from cart');
          }
        } else {
          // Remove from local storage
          set((state) => {
            const newItems = state.items.filter(
              (item) =>
                !(item.product.id === productId && item.variant?.id === variantId)
            );
            
            // Recalculate derived state for local storage persistence
            const newSubtotal = newItems.reduce((total, item) => {
                const price = item.product.sale_price || item.product.base_price;
                const variantAdjustment = item.variant?.price_adjustment || 0;
                return total + (price + variantAdjustment) * item.quantity;
            }, 0);

            const newShippingCost = newSubtotal < FREE_SHIPPING_THRESHOLD && newSubtotal > 0 ? DELIVERY_CHARGE : 0;
            
            // Recalculate coupon status
            // Note: Uses the min_purchase property if available for local validation
            const isCouponValid = state.appliedCoupon && 
              (!state.appliedCoupon.min_purchase || newSubtotal >= state.appliedCoupon.min_purchase);

            const newCoupon = isCouponValid ? state.appliedCoupon : null;
            if (state.appliedCoupon && !newCoupon) {
                 toast.warning('Coupon removed. Minimum purchase is no longer met.');
            }
            
            toast.success('Removed from cart');
            
            return { 
                items: newItems,
                appliedCoupon: newCoupon,
                shippingCost: newShippingCost
            };
          });
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

            // Reload from database, which resets appliedCoupon and shippingCost for safety
            await get().loadFromDatabase(user.id);
          } catch (error) {
            console.error('Error updating quantity:', error);
            toast.error('Failed to update quantity');
          }
        } else {
          // Update in local storage
          set((state) => {
            const newItems = state.items.map((item) =>
              item.product.id === productId && item.variant?.id === variantId
                ? { ...item, quantity }
                : item
            );

            // Recalculate derived state for local storage persistence
            const newSubtotal = newItems.reduce((total, item) => {
                const price = item.product.sale_price || item.product.base_price;
                const variantAdjustment = item.variant?.price_adjustment || 0;
                return total + (price + variantAdjustment) * item.quantity;
            }, 0);

            const newShippingCost = newSubtotal < FREE_SHIPPING_THRESHOLD && newSubtotal > 0 ? DELIVERY_CHARGE : 0;
            
            // Recalculate coupon status
            // Note: Uses the min_purchase property if available for local validation
            const isCouponValid = state.appliedCoupon && 
              (!state.appliedCoupon.min_purchase || newSubtotal >= state.appliedCoupon.min_purchase);
            
            const newCoupon = isCouponValid ? state.appliedCoupon : null;
            if (state.appliedCoupon && !newCoupon) {
                 toast.warning('Coupon removed. Minimum purchase is no longer met.');
            }
            
            return { 
                items: newItems,
                appliedCoupon: newCoupon,
                shippingCost: newShippingCost
            };
          });
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

            set({ items: [], appliedCoupon: null, shippingCost: 0 });
            toast.success('Cart cleared');
          } catch (error) {
            console.error('Error clearing cart:', error);
            toast.error('Failed to clear cart');
          }
        } else {
          // Clear from local storage
          set({ items: [], appliedCoupon: null, shippingCost: 0 });
          toast.success('Cart cleared');
        }
      },

      // --- Getter Functions ---
      getSubtotal: () => {
        return get().items.reduce((total, item) => {
          const price = item.product.sale_price || item.product.base_price;
          const variantAdjustment = item.variant?.price_adjustment || 0;
          return total + (price + variantAdjustment) * item.quantity;
        }, 0);
      },
      
      getShippingCost: () => {
        const subtotal = get().getSubtotal();
        // Shipping is only applied if subtotal is greater than 0 but below the free shipping threshold
        return subtotal < FREE_SHIPPING_THRESHOLD && subtotal > 0 ? DELIVERY_CHARGE : 0;
      },
      
      getDiscountAmount: () => {
          const subtotal = get().getSubtotal();
          const appliedCoupon = get().appliedCoupon;
          
          // Check if coupon exists AND if subtotal meets its minimum purchase
          // If min_purchase is not present, assume it's always valid (but this is risky in real apps)
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
      // ----------------------------

    }),
    {
      name: 'verdant-cart',
    }
  )
);