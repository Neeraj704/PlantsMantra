import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Trash2, Minus, Plus, ShoppingBag, Percent } from 'lucide-react';
import { useCart } from '@/hooks/useCart';
import { useState } from 'react'; // Added useState import
import { supabase } from '@/integrations/supabase/client'; // Import supabase for coupon check
import { toast } from 'sonner';

// --- Image Imports (assuming they are correctly defined in your file system) ---
import monsteraImg from '@/assets/monstera.jpg';
import snakePlantImg from '@/assets/snake-plant.jpg';
import pothosImg from '@/assets/pothos.jpg';
import fiddleLeafImg from '@/assets/fiddle-leaf.jpg';
// ------------------------------------------------------------------------------

const Cart = () => {
  const { 
    items, 
    removeItem, 
    updateQuantity, 
    getSubtotal, 
    getShippingCost, 
    getDiscountAmount, 
    getTotal,
    appliedCoupon,
    applyCoupon,
    removeCoupon
  } = useCart();
  
  const [couponCode, setCouponCode] = useState(appliedCoupon?.code || '');
  const [couponLoading, setCouponLoading] = useState(false);

  // NOTE: This array should ideally come from a centralized product data source, 
  // but we keep it here as in the original code.
  const productImages: Record<string, string> = {
    'monstera-deliciosa': monsteraImg,
    'snake-plant': snakePlantImg,
    'pothos': pothosImg,
    'fiddle-leaf-fig': fiddleLeafImg,
  };

  const subtotal = getSubtotal();
  const shipping = getShippingCost(); // Use new getter
  const discount = getDiscountAmount(); // Use new getter
  const total = getTotal(); // Use new getter

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) {
        toast.error('Please enter a coupon code.');
        return;
    }
    
    setCouponLoading(true);
    
    // Check local subtotal to prevent unnecessary API call if minimum is clearly not met
    // NOTE: For true validation, the backend should handle all checks. This is just for UX.
    
    try {
        // Call a Supabase Edge function to validate the coupon code
        const { data: result, error } = await supabase.functions.invoke('validate-coupon', {
            body: { 
                code: couponCode.trim(), 
                cartTotal: subtotal 
            },
        });
        
        if (error || !result.valid) {
            throw new Error(result.message || error?.message || 'Invalid coupon or unknown error.');
        }

        // Successfully applied the coupon from the database check
        applyCoupon({
            code: result.coupon.code,
            discountAmount: result.discount,
            min_purchase: result.coupon.min_purchase 
        });
        
        toast.success(`Coupon "${result.coupon.code}" applied! You saved ₹${result.discount.toFixed(2)}.`);
        
    } catch (error: any) {
        console.error('Coupon validation error:', error);
        removeCoupon(); // Clear local state of any potentially stale coupon
        toast.error(error.message || 'Failed to apply coupon.');
    } finally {
        setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    removeCoupon();
    setCouponCode('');
    toast.success('Coupon removed.');
  };
  
  if (items.length === 0) {
    return (
      <div className="min-h-screen pt-24 pb-12">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center py-16">
            <ShoppingBag className="w-24 h-24 mx-auto mb-6 text-muted-foreground" />
            <h1 className="text-3xl font-serif font-bold mb-4">Your Cart is Empty</h1>
            <p className="text-muted-foreground mb-8">
              Start adding some beautiful plants to your collection!
            </p>
            <Button size="lg" asChild className="gradient-hero">
              <Link to="/shop">Shop Plants</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-12">
      <div className="container mx-auto px-4">
        <h1 className="text-4xl font-serif font-bold mb-8">Shopping Cart</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {items.map((item, index) => {
              const imgSrc = productImages[item.product.slug] || monsteraImg;
              const price = (item.product.sale_price || item.product.base_price) + (item.variant?.price_adjustment || 0);
              const itemTotal = price * item.quantity;

              return (
                <motion.div
                  key={`${item.product.id}-${item.variant?.id}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex gap-4">
                        <div className="w-24 h-24 rounded-lg overflow-hidden bg-muted/50 flex-shrink-0">
                          <img
                            src={imgSrc}
                            alt={item.product.name}
                            className="w-full h-full object-cover"
                          />
                        </div>

                        <div className="flex-1">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <Link
                                to={`/product/${item.product.slug}`}
                                className="font-serif font-semibold text-lg hover:text-primary transition-smooth"
                              >
                                {item.product.name}
                              </Link>
                              {item.variant && (
                                <p className="text-sm text-muted-foreground">
                                  {item.variant.name}
                                </p>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeItem(item.product.id, item.variant?.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>

                          <div className="flex justify-between items-end">
                            <div className="flex items-center border border-border rounded-lg">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  updateQuantity(
                                    item.product.id,
                                    item.quantity - 1,
                                    item.variant?.id
                                  )
                                }
                              >
                                <Minus className="w-4 h-4" />
                              </Button>
                              <span className="px-4 py-2 min-w-[3rem] text-center">
                                {item.quantity}
                              </span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  updateQuantity(
                                    item.product.id,
                                    item.quantity + 1,
                                    item.variant?.id
                                  )
                                }
                              >
                                <Plus className="w-4 h-4" />
                              </Button>
                            </div>

                            <div className="text-right">
                              <p className="text-lg font-bold">₹{itemTotal.toFixed(2)}</p>
                              <p className="text-sm text-muted-foreground">
                                ₹{price.toFixed(2)} each
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <Card className="sticky top-24 shadow-card">
              <CardContent className="p-6">
                <h2 className="text-xl font-serif font-bold mb-6">Order Summary</h2>

                <div className="space-y-4 mb-6">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-semibold">₹{subtotal.toFixed(2)}</span>
                  </div>
                  
                  {/* Discount Row - New */}
                  {discount > 0 && (
                      <div className="flex justify-between text-sm text-green-600">
                          <span className="flex items-center gap-1">
                              <Percent className="w-4 h-4" /> Coupon Discount ({appliedCoupon?.code})
                          </span>
                          <span className="font-semibold">-₹{discount.toFixed(2)}</span>
                      </div>
                  )}
                  
                  {/* Shipping Row - Updated */}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Shipping</span>
                    {shipping === 0 ? (
                        <span className="font-semibold text-green-600">FREE</span>
                    ) : (
                        <span className="font-semibold">₹{shipping.toFixed(2)}</span>
                    )}
                  </div>

                  <Separator />

                  <div className="flex justify-between text-lg">
                    <span className="font-semibold">Order Total</span>
                    <span className="font-bold">₹{total.toFixed(2)}</span>
                  </div>
                </div>

                {/* Coupon Input/Display - Updated */}
                <div className="space-y-3 mb-6">
                  {appliedCoupon && discount > 0 ? (
                      <div className="flex justify-between items-center bg-green-50/50 p-3 rounded-md border border-green-200">
                          <p className="text-sm font-medium text-green-700">
                              Applied: <span className="font-mono">{appliedCoupon.code}</span>
                          </p>
                          <Button variant="ghost" size="sm" onClick={handleRemoveCoupon}>
                              Remove
                          </Button>
                      </div>
                  ) : (
                      <div className="flex gap-2">
                          <Input 
                              placeholder="Coupon code" 
                              value={couponCode}
                              onChange={(e) => setCouponCode(e.target.value)}
                              disabled={couponLoading}
                          />
                          <Button 
                              variant="outline" 
                              onClick={handleApplyCoupon}
                              disabled={couponLoading}
                          >
                              {couponLoading ? 'Applying...' : 'Apply'}
                          </Button>
                      </div>
                  )}
                </div>

                <Button size="lg" className="w-full gradient-hero mb-3" asChild>
                  <Link to="/checkout">Proceed to Checkout</Link>
                </Button>
                
                <Button size="lg" variant="outline" className="w-full" asChild>
                  <Link to="/shop">Continue Shopping</Link>
                </Button>

                {/* Free Shipping Message - Updated */}
                <div className="mt-6 p-4 bg-muted/30 rounded-lg">
                  <p className="text-sm text-center text-muted-foreground">
                    {shipping === 0 ? '✅ You qualify for FREE shipping!' : `⚠️ Shipping is ₹${shipping.toFixed(2)} on orders under ₹399 MRP.`}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cart;