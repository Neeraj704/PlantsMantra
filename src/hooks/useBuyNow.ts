import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CartItem } from '@/types/database';

interface BuyNowState {
  item: CartItem | null;
  isBuyNowFlow: boolean;
  setItemAndProceed: (item: CartItem) => void;
  getBuyNowItem: () => CartItem | null;
  clearBuyNow: () => void;
}

export const useBuyNow = create<BuyNowState>()(
  persist(
    (set, get) => ({
      item: null,
      isBuyNowFlow: false,

      setItemAndProceed: (item) => {
        set({ item, isBuyNowFlow: true });
      },

      getBuyNowItem: () => {
        if (get().isBuyNowFlow) {
          return get().item;
        }
        return null;
      },

      clearBuyNow: () => {
        set({ item: null, isBuyNowFlow: false });
      },
    }),
    {
      name: 'plantsmantra-buy-now',
      // We use sessionStorage so the state is cleared when the browser tab is closed.
      storage: {
        getItem: (name) => {
          const str = sessionStorage.getItem(name);
          if (!str) return null;
          return JSON.parse(str);
        },
        setItem: (name, value) => {
          sessionStorage.setItem(name, JSON.stringify(value));
        },
        removeItem: (name) => {
          sessionStorage.removeItem(name);
        },
      },
    }
  )
);