// src/pages/Checkout.tsx
import { useState, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/hooks/useCart';
import { useBuyNow } from '@/hooks/useBuyNow';
import { supabase, SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from '@/integrations/supabase/client';
import { Address } from '@/types/database';
import { toast } from 'sonner';
import { Plus, MapPin, CreditCard, Percent, Lock, X } from 'lucide-react';
import AddressForm from '@/components/AddressForm';
import monsteraImg from '@/assets/monstera.jpg';
import snakePlantImg from '@/assets/snake-plant.jpg';
import pothosImg from '@/assets/pothos.jpg';
import fiddleLeafImg from '@/assets/fiddle-leaf.jpg';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';

declare global {
  interface Window {
    Razorpay: any;
  }
}

/**
 * Helper: dynamically load Razorpay SDK
 */
const loadRazorpayScript = (src: string) => {
  return new Promise<boolean>((resolve) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) return resolve(true);
    const script = document.createElement('script');
    script.src = src;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

const Checkout = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const cart = useCart();
  const { item: buyNowItem, isBuyNowFlow, clearBuyNow } = useBuyNow();

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<string>('');
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'razorpay' | 'cod'>('razorpay');
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);

  const [isCODDialogOpen, setIsCODDialogOpen] = useState(false);

  const isDirectBuy = isBuyNowFlow && buyNowItem;
  const items = isDirectBuy ? [buyNowItem] : cart.items;

  useEffect(() => {
    if (user) fetchAddresses();
    loadRazorpayScript('https://checkout.razorpay.com/v1/checkout.js').then((loaded) => {
      setRazorpayLoaded(!!loaded);
    });

    return () => {
      // preserve behavior: clear buy-now state on unmount if it was a buy-now flow
      if (isBuyNowFlow) {
        clearBuyNow();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const fetchAddresses = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('addresses')
      .select('*')
      .eq('user_id', user.id)
      .order('is_default', { ascending: false });
    if (data) {
      setAddresses(data);
      const defaultAddr = data.find((a) => a.is_default);
      if (defaultAddr) setSelectedAddress(defaultAddr.id);
    }
  };

  const handleAddressSubmit = async () => {
    await fetchAddresses();
    setShowAddressForm(false);
  };

  const getSubtotal = () => {
    if (!items || items.length === 0) return 0;
    return items.reduce((total, item) => {
      if (!item) return total;
      const price = item.product.sale_price || item.product.base_price;
      const variantAdjustment = item.variant?.price_adjustment || 0;
      return total + (price + variantAdjustment) * item.quantity;
    }, 0);
  };

  const subtotal = getSubtotal();
  const shippingCost = subtotal > 0 && subtotal < 399 ? 99 : 0;
  const discountAmount = isDirectBuy ? 0 : cart.getDiscountAmount();
  const total = subtotal + shippingCost - discountAmount;

  /**
   * Initiate Razorpay: opens checkout and verifies payment on success.
   * NOTE: does NOT clear cart. Cart clearing happens only after verification succeeds.
   */
  const initiateRazorpayPayment = async (orderId: string, totalAmount: number, address: Address) => {
    try {
      if (!razorpayLoaded) {
        toast.error('Payment gateway not loaded. Please refresh.');
        setProcessing(false);
        return false;
      }

      // create razorpay order server-side (edge function)
      const createOrderResponse = await fetch(`${SUPABASE_URL}/functions/v1/create-razorpay-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}` },
        body: JSON.stringify({ amount: Math.round(totalAmount * 100) }), // in paise
      });

      if (!createOrderResponse.ok) {
        const err = await createOrderResponse.json().catch(() => null);
        throw new Error(err?.error || 'Failed to create Razorpay order');
      }
      const orderData = await createOrderResponse.json();

      const options = {
        key: orderData.key,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'PlantsMantra',
        description: `Order ID: ${String(orderId).slice(0, 8)}`,
        order_id: orderData.razorpayOrderId,
        handler: async (response: any) => {
          // Verify on backend
          try {
            const verifyRes = await fetch(`${SUPABASE_URL}/functions/v1/verify-razorpay-payment`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}` },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                internal_order_id: orderId,
              }),
            });

            const verifyData = await verifyRes.json();
            if (!verifyRes.ok || !verifyData.success) {
              throw new Error(verifyData.error || 'Payment verification failed');
            }

            // Payment verified successfully: clear cart / buy-now and navigate
            if (isDirectBuy) {
              clearBuyNow();
            } else {
              cart.clearCart();
            }

            // Optionally update order's payment_status/status if not already done by edge function
            toast.success('Payment successful! Order confirmed.');
            setProcessing(false);
            navigate('/account');
          } catch (err: any) {
            console.error('Payment verification failed:', err);
            toast.error(`Payment verification failed: ${err?.message || 'unknown error'}`);
            setProcessing(false);
          }
        },
        prefill: { name: address.full_name, email: user?.email, contact: address.phone },
        theme: { color: '#4ADE80' },
        modal: {
          ondismiss: () => {
            // user closed the modal without completing payment
            setProcessing(false);
            toast.info('Payment was cancelled.');
          },
        },
      };

      const rzp = new window.Razorpay(options);

      rzp.on('payment.failed', (response: any) => {
        console.error('Payment failed:', response.error);
        toast.error(`Payment failed: ${response.error?.description || 'Unknown error'}`);
        setProcessing(false);
      });

      rzp.open();
      return true;
    } catch (err: any) {
      console.error('Payment initiation error:', err);
      toast.error(err?.message || 'Failed to initiate checkout');
      setProcessing(false);
      return false;
    }
  };

  /**
   * Create order & order items in DB (common function used for both COD (after confirmation) and Razorpay pre-checkout).
   * Returns the created order record (including id) or throws.
   */
  const createOrderRecord = async (address: Address) => {
    const { data: order, error } = await supabase
      .from('orders')
      .insert({
        user_id: user?.id,
        customer_email: user?.email,
        customer_name: address.full_name,
        customer_phone: address.phone,
        shipping_address: address as any,
        subtotal,
        discount_amount: discountAmount,
        shipping_cost: shippingCost,
        coupon_code: isDirectBuy ? null : cart.appliedCoupon?.code || null,
        payment_method: paymentMethod,
        total,
        status: 'pending',
        payment_status: paymentMethod === 'cod' ? 'unpaid' : 'pending',
      })
      .select()
      .single();

    if (error || !order) {
      throw error || new Error('Order creation failed');
    }

    const orderItems = items.map((item) => {
      const unitPrice = (item.product.sale_price || item.product.base_price) + (item.variant?.price_adjustment || 0);
      return {
        order_id: order.id,
        product_id: item.product.id,
        variant_id: item.variant?.id || null,
        product_name: item.product.name,
        variant_name: item.variant?.name || null,
        quantity: item.quantity,
        unit_price: unitPrice,
        subtotal: unitPrice * item.quantity,
      };
    });

    const { error: itemsError } = await supabase.from('order_items').insert(orderItems);
    if (itemsError) throw itemsError;

    return order;
  };

  /**
   * Handler invoked when user clicks "Place Order" button.
   * If COD: open confirmation dialog. If online: create order then open Razorpay modal.
   */
  const handlePlaceOrderClick = () => {
    if (!selectedAddress) {
      toast.error('Please select a shipping address');
      return;
    }
    // If COD, open dialog and do not proceed yet.
    if (paymentMethod === 'cod') {
      setIsCODDialogOpen(true);
      return;
    }

    // For online payment: proceed with creating order then open Razorpay.
    handleOnlinePaymentFlow();
  };

  /**
   * Handle online payment flow: create order record, items, then call initiateRazorpayPayment.
   * CART IS NOT CLEARED HERE — it will be cleared after verification success.
   */
  const handleOnlinePaymentFlow = async () => {
    setProcessing(true);
    try {
      const address = addresses.find((a) => a.id === selectedAddress);
      if (!address) throw new Error('Selected address not found');

      const order = await createOrderRecord(address);

      // initiate razorpay
      await initiateRazorpayPayment(order.id, total, address);
      // do not clear cart here — the verification handler clears it
    } catch (err: any) {
      console.error('Failed to start online payment:', err);
      toast.error(err?.message || 'Failed to start payment');
      setProcessing(false);
    }
  };

  /**
   * Called when user confirms in COD dialog. Creates order and clears cart on success.
   */
  const handleConfirmCOD = async () => {
    setProcessing(true);
    try {
      const address = addresses.find((a) => a.id === selectedAddress);
      if (!address) throw new Error('Selected address not found');

      const order = await createOrderRecord(address);

      // ⭐ CREATE DELHIVERY SHIPMENT FOR COD ⭐
      try {
        await supabase.functions.invoke("delhivery-create", {
          method: "POST",
          body: JSON.stringify({ orderId: order.id }),
        });
      } catch (err) {
        console.error("Failed to create Delhivery shipment:", err);
        // Not blocking order — label can still be created later manually
      }

      // For COD, clear cart immediately after successful order creation
      if (isDirectBuy) {
        clearBuyNow();
      } else {
        cart.clearCart();
      }

      toast.success(`Order placed! Pay ₹${total.toFixed(2)} on delivery.`);
      setIsCODDialogOpen(false);
      setProcessing(false);
      navigate('/account');
    } catch (err: any) {
      console.error('Failed to place COD order:', err);
      toast.error(err?.message || 'Failed to place order');
      setProcessing(false);
    }
  };

  if (!user || !profile) return <Navigate to="/auth" replace />;
  if (!items || items.length === 0) return <Navigate to="/shop" replace />;

  const currentAddress = addresses.find((a) => a.id === selectedAddress);

  const productImages = {
    'monstera-deliciosa': monsteraImg,
    'snake-plant': snakePlantImg,
    'pothos': pothosImg,
    'fiddle-leaf-fig': fiddleLeafImg,
  };

  return (
    <div className="min-h-screen pt-24 pb-12">
      <div className="container mx-auto px-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-6xl mx-auto">
          <h1 className="text-4xl font-serif font-bold mb-8">Checkout</h1>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="w-5 h-5" />
                    1. Shipping Address
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {addresses && addresses.length > 0 ? (
                      addresses.map((addr) => (
                        <label
                          key={addr.id}
                          className={`block border rounded-lg p-3 cursor-pointer ${selectedAddress === addr.id ? 'ring-2 ring-primary' : ''}`}
                        >
                          <input
                            type="radio"
                            name="address"
                            value={addr.id}
                            checked={selectedAddress === addr.id}
                            onChange={() => setSelectedAddress(addr.id)}
                            className="hidden"
                          />
                          <div className="flex justify-between">
                            <div>
                              <div className="font-medium">{addr.full_name}</div>
                              <div className="text-sm text-muted-foreground">{addr.address_line1} {addr.address_line2}</div>
                              <div className="text-sm text-muted-foreground">{addr.city}, {addr.state} - {addr.postal_code}</div>
                              <div className="text-sm text-muted-foreground">Phone: {addr.phone}</div>
                            </div>
                            <div className="text-sm text-muted-foreground">{addr.is_default ? 'Default' : ''}</div>
                          </div>
                        </label>
                      ))
                    ) : (
                      <div className="text-sm text-muted-foreground">No saved addresses yet.</div>
                    )}

                    <div className="pt-2">
                      {showAddressForm ? (
                        <AddressForm onCancel={() => setShowAddressForm(false)} onSubmit={handleAddressSubmit} />
                      ) : (
                        <Button variant="outline" onClick={() => setShowAddressForm(true)}>
                          <Plus className="w-4 h-4 mr-2" /> Add new address
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {selectedAddress && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CreditCard className="w-5 h-5" />
                      2. Payment Method
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <RadioGroup value={paymentMethod} onValueChange={(val) => setPaymentMethod(val as 'razorpay' | 'cod')} className="mb-4">
                      <div className="flex items-center space-x-2 border rounded-lg p-3">
                        <RadioGroupItem value="razorpay" id="razorpay" />
                        <Label htmlFor="razorpay" className="flex-1 cursor-pointer font-medium">Card / UPI / Netbanking (Razorpay)</Label>
                      </div>
                      <div className="flex items-center space-x-2 border rounded-lg p-3">
                        <RadioGroupItem value="cod" id="cod" />
                        <Label htmlFor="cod" className="flex-1 cursor-pointer font-medium">Cash on Delivery</Label>
                      </div>
                    </RadioGroup>

                    <Button
                      className="w-full gradient-hero"
                      onClick={handlePlaceOrderClick}
                      disabled={processing || !currentAddress}
                    >
                      {processing ? 'Processing...' : paymentMethod === 'cod' ? 'Place Order (COD)' : <><Lock className="w-4 h-4 mr-2" />Continue to Pay ₹{total.toFixed(2)}</>}
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>

            <div className="lg:col-span-1">
              <Card className="sticky top-24">
                <CardHeader>
                  <CardTitle>Order Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 mb-4 max-h-64 overflow-y-auto pr-2">
                    {items.map((item) => {
                      const imgSrc = item.product.main_image_url || productImages[item.product.slug] || monsteraImg;
                      const price = (item.product.sale_price || item.product.base_price) + (item.variant?.price_adjustment || 0);
                      return (
                        <div key={`${item.product.id}-${item.variant?.id || 'no-variant'}`} className="flex gap-3">
                          <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted/50 flex-shrink-0">
                            <img src={imgSrc} alt={item.product.name} className="w-full h-full object-cover" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{item.product.name}</p>
                            {item.variant && <p className="text-xs text-muted-foreground">{item.variant.name}</p>}
                            <p className="text-sm"><span className="text-muted-foreground">Qty: {item.quantity}</span> × <span className="font-semibold">₹{price.toFixed(2)}</span></p>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <Separator className="my-4" />
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span className="font-semibold">₹{subtotal.toFixed(2)}</span>
                    </div>
                    {!isDirectBuy && discountAmount > 0 && (
                      <div className="flex justify-between text-sm text-green-600">
                        <span className="text-muted-foreground flex items-center gap-1"><Percent className="w-3 h-3" />Discount ({cart.appliedCoupon?.code})</span>
                        <span className="font-semibold">-₹{discountAmount.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Shipping</span>
                      {shippingCost === 0 ? <span className="font-semibold text-green-600">FREE</span> : <span className="font-semibold">₹{shippingCost.toFixed(2)}</span>}
                    </div>

                    <Separator className="my-2" />
                    <div className="flex justify-between">
                      <span className="font-semibold">Order Total</span>
                      <span className="font-bold text-lg">₹{total.toFixed(2)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </motion.div>
      </div>

      {/* COD Confirmation Dialog (Option B fancy) */}
      <Dialog open={isCODDialogOpen} onOpenChange={(open) => setIsCODDialogOpen(open)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Confirm Cash on Delivery</DialogTitle>
            <DialogDescription>
              Please confirm that you want to place this order and pay <strong>₹{total.toFixed(2)}</strong> at the time of delivery.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 border rounded-lg p-3 max-h-64 overflow-y-auto">
            {items.map((item) => {
              const price = (item.product.sale_price || item.product.base_price) + (item.variant?.price_adjustment || 0);
              return (
                <div key={`${item.product.id}-${item.variant?.id || 'no-variant'}`} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <div className="font-medium text-sm">{item.product.name}</div>
                    {item.variant && <div className="text-xs text-muted-foreground">{item.variant.name}</div>}
                    <div className="text-xs text-muted-foreground">Qty: {item.quantity}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">₹{(price * item.quantity).toFixed(2)}</div>
                    <div className="text-xs text-muted-foreground">₹{price.toFixed(2)} each</div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 flex justify-between items-center">
            <div>
              <div className="text-sm text-muted-foreground">Subtotal</div>
              <div className="font-semibold">₹{subtotal.toFixed(2)}</div>
              <div className="text-sm text-muted-foreground">Shipping: {shippingCost === 0 ? 'FREE' : `₹${shippingCost.toFixed(2)}`}</div>
            </div>
            <div className="text-right">
              <div className="text-sm text-muted-foreground">Total</div>
              <div className="text-2xl font-bold">₹{total.toFixed(2)}</div>
            </div>
          </div>

          <DialogFooter className="mt-6 flex justify-end gap-24">
            <Button variant="ghost" onClick={() => setIsCODDialogOpen(false)} disabled={processing}>
              <X className="w-4 h-4 mr-2" />Cancel
            </Button>
            <Button className="gradient-hero" onClick={handleConfirmCOD} disabled={processing}>
              {processing ? 'Placing...' : `Confirm & Place Order (₹${total.toFixed(2)})`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Checkout;
