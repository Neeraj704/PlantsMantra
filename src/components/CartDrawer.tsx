import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '@/hooks/useCart';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Minus, Plus, Trash2, ShoppingBag, Truck, Gift, Percent, ShieldCheck, Tag, Heart } from 'lucide-react';
import { getProxiedUrl, supabase } from '@/integrations/supabase/client';
import { DrawerRecommendations } from './DrawerRecommendations';
import { toast } from 'sonner';

const FREE_SHIPPING_THRESHOLD = 599;
const FREE_GIFT_THRESHOLD = 899;
const DISCOUNT_THRESHOLD = 1299;

export const CartDrawer = () => {
  const { 
    items, 
    removeItem, 
    updateQuantity, 
    getSubtotal, 
    isCartOpen, 
    setCartOpen,
    appliedCoupon,
    applyCoupon,
    removeCoupon,
  } = useCart();
  
  const navigate = useNavigate();
  const [couponCode, setCouponCode] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [showGiftNote, setShowGiftNote] = useState(false);
  const [giftNote, setGiftNote] = useState('');

  const subtotal = getSubtotal();

  // Calculate total original price vs current price to compute savings
  const originalTotal = items.reduce((sum, item) => {
    const origPrice = item.product.base_price + (item.variant?.price_adjustment || 0);
    return sum + origPrice * item.quantity;
  }, 0);

  const discountFromSale = Math.max(0, originalTotal - subtotal);
  const couponDiscount = appliedCoupon ? appliedCoupon.discountAmount : 0;
  const totalSavings = discountFromSale + couponDiscount;

  // Milestone Progress
  const progressPercent = Math.min(100, (subtotal / DISCOUNT_THRESHOLD) * 100);

  let milestoneText = '';
  if (subtotal < FREE_SHIPPING_THRESHOLD) {
    const diff = Math.ceil(FREE_SHIPPING_THRESHOLD - subtotal);
    milestoneText = `Add ₹${diff} more for FREE shipping 🚚`;
  } else if (subtotal < FREE_GIFT_THRESHOLD) {
    const diff = Math.ceil(FREE_GIFT_THRESHOLD - subtotal);
    milestoneText = `Free shipping unlocked! Add ₹${diff} for a Free Plant Gift 🎁`;
  } else if (subtotal < DISCOUNT_THRESHOLD) {
    const diff = Math.ceil(DISCOUNT_THRESHOLD - subtotal);
    milestoneText = `Free Gift unlocked! Add ₹${diff} for 10% Extra Discount ⚡`;
  } else {
    milestoneText = `🎉 All Perks Unlocked: Free Shipping + Gift + 10% Off!`;
  }

  const handleCheckout = () => {
    setCartOpen(false);
    navigate('/checkout');
  };

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) {
      toast.error('Please enter a coupon code');
      return;
    }
    setCouponLoading(true);
    try {
      const { data: result, error } = await supabase.functions.invoke('validate-coupon', {
        body: { code: couponCode.trim(), cartTotal: subtotal }
      });

      if (error || !result?.valid) {
        throw new Error(result?.message || error?.message || 'Invalid coupon code');
      }

      applyCoupon({
        code: result.coupon.code,
        discountAmount: result.discount,
        min_purchase: result.coupon.min_purchase,
      });
      toast.success(`Coupon "${result.coupon.code}" applied! Saved ₹${result.discount}`);
      setCouponCode('');
    } catch (e: any) {
      toast.error(e.message || 'Failed to apply coupon');
    } finally {
      setCouponLoading(false);
    }
  };

  return (
    <Sheet open={isCartOpen} onOpenChange={setCartOpen}>
      <SheetContent className="w-full sm:max-w-md flex flex-col p-0 bg-white">
        {/* Top Scrolling Notification Strip */}
        <div className="w-full bg-[#1b3b22] text-[#e8f5e9] py-1.5 px-3 text-[10px] sm:text-xs font-medium text-center flex items-center justify-center gap-1.5 select-none">
          <span>🎁 Free Mystery Gift Above ₹899</span>
          <span>•</span>
          <span>🚚 Free Delivery Above ₹599</span>
          <span>•</span>
          <span>⚡ Express 72h Dispatch</span>
        </div>

        <SheetHeader className="px-4 py-3 border-b flex flex-row items-center justify-between space-y-0">
          <SheetTitle className="flex items-center gap-2 font-serif text-lg text-emerald-950">
            <ShoppingBag className="w-5 h-5 text-emerald-800" />
            Shopping Cart ({items.reduce((acc, item) => acc + item.quantity, 0)})
          </SheetTitle>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mb-4">
              <ShoppingBag className="w-8 h-8 text-emerald-700" />
            </div>
            <h3 className="text-lg font-serif font-bold text-gray-900 mb-1">Your cart is empty</h3>
            <p className="text-muted-foreground mb-6 text-xs sm:text-sm max-w-xs">
              Explore our fresh collection of plants, pots, and gardening care essentials.
            </p>
            <Button 
              className="gradient-hero"
              onClick={() => { setCartOpen(false); navigate('/shop'); }}
            >
              Start Shopping
            </Button>
          </div>
        ) : (
          <>
            {/* Gamified Milestone Progress Tracker */}
            <div className="px-4 py-3 bg-emerald-50/70 border-b border-emerald-100/80">
              <p className="text-xs font-semibold text-emerald-900 text-center mb-2">
                {milestoneText}
              </p>
              
              {/* Bar */}
              <div className="relative w-full h-2 bg-emerald-200/60 rounded-full overflow-hidden mb-1.5">
                <div 
                  className="h-full bg-gradient-to-r from-emerald-600 to-teal-500 rounded-full transition-all duration-500"
                  style={{ width: `${Math.max(4, progressPercent)}%` }}
                />
              </div>

              {/* Milestones labels */}
              <div className="flex justify-between text-[10px] font-medium text-emerald-800 px-0.5">
                <span className="flex items-center gap-0.5">
                  <Truck className="w-2.5 h-2.5" /> Free Ship (₹599)
                </span>
                <span className="flex items-center gap-0.5">
                  <Gift className="w-2.5 h-2.5" /> Free Gift (₹899)
                </span>
                <span className="flex items-center gap-0.5">
                  <Percent className="w-2.5 h-2.5" /> 10% Off (₹1299)
                </span>
              </div>
            </div>

            {/* Cart Items List */}
            <ScrollArea className="flex-1 px-4 py-2">
              <div className="divide-y divide-gray-100">
                {items.map((item) => {
                  const imgSrc = getProxiedUrl(item.product.main_image_url) || '/placeholder.svg';
                  const basePrice = item.product.base_price + (item.variant?.price_adjustment || 0);
                  const salePrice = item.product.sale_price !== null ? item.product.sale_price + (item.variant?.price_adjustment || 0) : null;
                  const currentPrice = salePrice || basePrice;

                  return (
                    <div key={`${item.product.id}-${item.variant?.id}`} className="py-3 flex gap-3">
                      <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-md overflow-hidden bg-gray-50 flex-shrink-0 border border-gray-100">
                        <img 
                          src={imgSrc} 
                          alt={item.product.name} 
                          className="w-full h-full object-cover" 
                          loading="lazy"
                        />
                      </div>
                      
                      <div className="flex-1 flex flex-col justify-between min-w-0">
                        <div>
                          <div className="flex justify-between items-start gap-1">
                            <Link 
                              to={`/product/${item.product.slug}`} 
                              onClick={() => setCartOpen(false)}
                              className="font-medium text-xs sm:text-sm text-gray-900 hover:text-emerald-700 transition-colors line-clamp-1 leading-snug"
                            >
                              {item.product.name}
                            </Link>
                            <button 
                              aria-label="Remove item"
                              className="text-gray-400 hover:text-red-500 transition-colors p-0.5"
                              onClick={() => removeItem(item.product.id, item.variant?.id)}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          {item.variant && (
                            <p className="text-[10px] text-muted-foreground mt-0.5">{item.variant.name}</p>
                          )}
                        </div>

                        <div className="flex justify-between items-end mt-2">
                          {/* Quantity selector */}
                          <div className="flex items-center border border-gray-200 rounded">
                            <button 
                              className="h-6 w-6 flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-colors"
                              onClick={() => updateQuantity(item.product.id, item.quantity - 1, item.variant?.id)}
                            >
                              <Minus className="w-2.5 h-2.5" />
                            </button>
                            <span className="w-6 text-center text-xs font-semibold text-gray-800">{item.quantity}</span>
                            <button 
                              className="h-6 w-6 flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-colors"
                              onClick={() => updateQuantity(item.product.id, item.quantity + 1, item.variant?.id)}
                            >
                              <Plus className="w-2.5 h-2.5" />
                            </button>
                          </div>

                          <div className="text-right">
                            <span className="font-bold text-xs sm:text-sm text-gray-900">
                              ₹{(currentPrice * item.quantity).toFixed(2)}
                            </span>
                            {salePrice && (
                              <span className="block text-[10px] text-muted-foreground line-through">
                                ₹{(basePrice * item.quantity).toFixed(2)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Personalized Gift Note Option */}
              <div className="mt-2 py-2 border-t border-gray-100">
                <button
                  onClick={() => setShowGiftNote(!showGiftNote)}
                  className="text-xs font-medium text-emerald-800 hover:text-emerald-950 flex items-center gap-1.5 transition-colors"
                >
                  <Gift className="w-3.5 h-3.5" />
                  <span>{showGiftNote ? 'Hide gift note' : 'Add a personalized gift note 🎁'}</span>
                </button>
                {showGiftNote && (
                  <div className="mt-2 space-y-1">
                    <Input
                      placeholder="Write your message here (e.g. Happy Birthday!)..."
                      value={giftNote}
                      onChange={(e) => setGiftNote(e.target.value)}
                      className="text-xs h-8"
                    />
                    <p className="text-[10px] text-muted-foreground">We'll print this on a cute card inside your parcel!</p>
                  </div>
                )}
              </div>

              {/* Inline Coupon Code */}
              <div className="mt-2 py-2 border-t border-gray-100">
                {appliedCoupon ? (
                  <div className="flex items-center justify-between bg-emerald-50 px-2.5 py-1.5 rounded border border-emerald-200">
                    <span className="text-xs font-medium text-emerald-900 flex items-center gap-1">
                      <Tag className="w-3 h-3 text-emerald-600" /> Coupon "{appliedCoupon.code}" applied
                    </span>
                    <button 
                      onClick={removeCoupon}
                      className="text-[11px] text-red-600 hover:underline font-semibold"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Input
                      placeholder="Enter coupon code..."
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value)}
                      className="text-xs h-8"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs px-3 font-semibold"
                      disabled={couponLoading || !couponCode.trim()}
                      onClick={handleApplyCoupon}
                    >
                      {couponLoading ? '...' : 'Apply'}
                    </Button>
                  </div>
                )}
              </div>

              {/* Recommendations */}
              <DrawerRecommendations />
            </ScrollArea>

            {/* Bottom Footer Section */}
            <div className="border-t p-4 bg-gray-50/70 space-y-3">
              {/* Savings banner */}
              {totalSavings > 0 && (
                <div className="bg-emerald-100/80 border border-emerald-300/80 text-emerald-900 py-1 px-2.5 rounded text-center text-xs font-semibold flex items-center justify-center gap-1">
                  <span>🎉 You're saving ₹{totalSavings.toFixed(2)} on this order!</span>
                </div>
              )}

              {/* Subtotal */}
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600 font-medium">Subtotal</span>
                <span className="font-bold text-base text-gray-950">₹{subtotal.toFixed(2)}</span>
              </div>

              {/* Checkout CTA */}
              <div className="space-y-2">
                <Button 
                  className="w-full gradient-hero text-sm font-semibold h-11 flex items-center justify-center gap-2 shadow-md"
                  onClick={handleCheckout}
                >
                  <span>Proceed to Checkout</span>
                  <span>•</span>
                  <span>₹{subtotal.toFixed(2)}</span>
                </Button>

                {/* Trust Badges & Payment methods */}
                <div className="flex items-center justify-center gap-3 text-[10px] text-gray-500 pt-1">
                  <span className="flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-emerald-700" /> 100% Secure Checkout
                  </span>
                  <span>•</span>
                  <span>UPI / Cards / NetBanking / COD</span>
                </div>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
};
