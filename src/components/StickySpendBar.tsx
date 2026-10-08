import { useCart } from '@/hooks/useCart';
import { ShoppingCart, Truck, Gift, Percent } from 'lucide-react';

const FREE_SHIPPING_THRESHOLD = 599;
const FREE_GIFT_THRESHOLD = 899;
const DISCOUNT_THRESHOLD = 1299;

export const StickySpendBar = () => {
  const { getSubtotal, setCartOpen, items } = useCart();
  const subtotal = getSubtotal();

  // Progress percentage capped at 100%
  const progressPercent = Math.min(100, (subtotal / DISCOUNT_THRESHOLD) * 100);

  // Message logic
  let message = '';
  if (subtotal === 0) {
    message = 'Spend ₹599 for 🚚 Free Shipping — plus a free gift & discounts!';
  } else if (subtotal < FREE_SHIPPING_THRESHOLD) {
    const diff = Math.ceil(FREE_SHIPPING_THRESHOLD - subtotal);
    message = `Spend ₹${diff} more for 🚚 Free Shipping — plus a free gift!`;
  } else if (subtotal < FREE_GIFT_THRESHOLD) {
    const diff = Math.ceil(FREE_GIFT_THRESHOLD - subtotal);
    message = `🎉 Free Shipping unlocked! Spend ₹${diff} more for 🎁 Free Mystery Gift!`;
  } else if (subtotal < DISCOUNT_THRESHOLD) {
    const diff = Math.ceil(DISCOUNT_THRESHOLD - subtotal);
    message = `🎁 Free Gift unlocked! Add ₹${diff} more for ⚡ 10% EXTRA Discount!`;
  } else {
    message = `🔥 All Perks Unlocked: Free Shipping + Free Gift + 10% Off!`;
  }

  const totalQuantity = items.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <aside 
      aria-label="Free shipping and rewards progress"
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-[95%] max-w-xl animate-in slide-in-from-bottom-4 duration-500"
    >
      <div 
        onClick={() => setCartOpen(true)}
        className="bg-[#1b3b22]/95 backdrop-blur-md text-white px-4 py-2.5 rounded-full shadow-2xl border border-emerald-700/50 flex items-center gap-3 cursor-pointer hover:bg-[#1b3b22] transition-all hover:scale-[1.01] group select-none"
      >
        {/* Cart Icon circle */}
        <div className="relative w-8 h-8 rounded-full bg-emerald-700/60 flex items-center justify-center flex-shrink-0 group-hover:bg-emerald-600 transition-colors">
          <ShoppingCart className="w-4 h-4 text-emerald-200" />
          {totalQuantity > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
              {totalQuantity}
            </span>
          )}
        </div>

        {/* Text & Progress bar */}
        <div className="flex-1 min-w-0">
          <p className="text-[11px] sm:text-xs font-medium text-emerald-100 truncate">
            {message}
          </p>

          {/* Milestone Track */}
          <div className="relative w-full h-1.5 bg-emerald-950/80 rounded-full mt-1.5 overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-emerald-400 via-teal-300 to-amber-300 rounded-full transition-all duration-500"
              style={{ width: `${Math.max(5, progressPercent)}%` }}
            />
          </div>

          {/* Milestone Markers */}
          <div className="flex justify-between text-[9px] text-emerald-300/80 mt-0.5 px-0.5">
            <span className="flex items-center gap-0.5">
              <Truck className="w-2.5 h-2.5" /> ₹599 Free Ship
            </span>
            <span className="flex items-center gap-0.5">
              <Gift className="w-2.5 h-2.5" /> ₹899 Gift
            </span>
            <span className="flex items-center gap-0.5">
              <Percent className="w-2.5 h-2.5" /> ₹1299 10% Off
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
};
