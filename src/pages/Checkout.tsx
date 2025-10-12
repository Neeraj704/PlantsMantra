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
import { supabase, SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from '@/integrations/supabase/client';
import { Address } from '@/types/database';
import { toast } from 'sonner';
import { Plus, MapPin, CreditCard, Percent, Lock } from 'lucide-react';
import AddressForm from '@/components/AddressForm';
import { StripePayment } from '@/components/StripePayment';
import monsteraImg from '@/assets/monstera.jpg';
import snakePlantImg from '@/assets/snake-plant.jpg';
import pothosImg from '@/assets/pothos.jpg';
import fiddleLeafImg from '@/assets/fiddle-leaf.jpg';

declare global {
  interface Window {
    Razorpay: any;
  }
}

const loadRazorpayScript = (src: string) => {
  return new Promise((resolve) => {
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
  const { items, getSubtotal, getShippingCost, getDiscountAmount, getTotal, clearCart, appliedCoupon } = useCart();

  const [step, setStep] = useState<'shipping' | 'payment'>('shipping');
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<string>('');
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'stripe' | 'razorpay' | 'cod'>('razorpay');
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);

  const subtotal = getSubtotal();
  const shippingCost = getShippingCost();
  const discountAmount = getDiscountAmount();
  const total = getTotal();

  useEffect(() => {
    if (user) fetchAddresses();
  }, [user]);

  useEffect(() => {
    loadRazorpayScript('https://checkout.razorpay.com/v1/checkout.js').then((loaded) => {
      setRazorpayLoaded(Boolean(loaded));
    });
  }, []);

  const fetchAddresses = async () => {
    const { data } = await supabase.from('addresses' as any).select('*').eq('user_id', user?.id).order('is_default', { ascending: false });
    if (data) {
      setAddresses(data as any);
      const defaultAddr = data.find((a: any) => a.is_default);
      if (defaultAddr) setSelectedAddress(defaultAddr.id);
    }
  };

  const handleAddressSubmit = async () => {
    await fetchAddresses();
    setShowAddressForm(false);
  };

  const initiateRazorpayPayment = async (orderId: string, totalAmount: number, address: Address) => {
    try {
      if (!razorpayLoaded) {
        toast.error('Payment gateway not loaded. Please refresh.');
        return;
      }

      const createOrderResponse = await fetch(`${SUPABASE_URL}/functions/v1/create-razorpay-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ amount: totalAmount }),
      });

      if (!createOrderResponse.ok) throw new Error('Failed to create Razorpay order');
      const orderData = await createOrderResponse.json();

      const options = {
        key: orderData.key,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'PlantsMantra',
        description: `Order ID: ${orderId.slice(0, 8)}`,
        order_id: orderData.razorpayOrderId,
        handler: async (response: any) => {
          try {
            const verifyRes = await fetch(`${SUPABASE_URL}/functions/v1/verify-razorpay-payment`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
              },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                internal_order_id: orderId,
              }),
            });

            const verifyData = await verifyRes.json();
            if (!verifyRes.ok || !verifyData.success) throw new Error('Verification failed');
            toast.success('Payment successful! Order confirmed.');
            clearCart();
            navigate('/account');
          } catch (err: any) {
            toast.error(`Payment verification failed: ${err.message}`);
          }
        },
        prefill: {
          name: address.full_name || profile.full_name || user.email,
          email: user.email,
          contact: address.phone || profile.phone || '9999999999',
        },
        theme: { color: '#4ADE80' },
        modal: {
          ondismiss: () => toast.info('Payment cancelled.'),
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err: any) {
      toast.error(err.message || 'Payment initiation failed');
    }
  };

  const handlePlaceOrder = async () => {
    if (!selectedAddress) return toast.error('Please select a shipping address');

    setProcessing(true);
    const isCod = paymentMethod === 'cod';

    try {
      const address = addresses.find(a => a.id === selectedAddress);
      if (!address) throw new Error('Address not found');

      const { data: order, error } = await supabase.from('orders' as any).insert({
        user_id: user?.id,
        customer_email: user?.email,
        customer_name: address.full_name,
        customer_phone: address.phone,
        shipping_address: address,
        subtotal,
        discount_amount: discountAmount,
        shipping_cost: shippingCost,
        coupon_code: appliedCoupon?.code || null,
        payment_method: paymentMethod,
        total,
        status: isCod ? 'pending' : 'pending',
        payment_status: isCod ? 'unpaid' : 'pending',
      }).select().single();

      if (error || !order) throw error || new Error('Order creation failed');

      const orderItems = items.map(item => ({
        order_id: order.id,
        product_id: item.product.id,
        variant_id: item.variant?.id,
        product_name: item.product.name,
        variant_name: item.variant?.name,
        quantity: item.quantity,
        unit_price: (item.product.sale_price || item.product.base_price) + (item.variant?.price_adjustment || 0),
        subtotal: ((item.product.sale_price || item.product.base_price) + (item.variant?.price_adjustment || 0)) * item.quantity,
      }));

      const { error: itemsError } = await supabase.from('order_items').insert(orderItems);
      if (itemsError) throw itemsError;

      if (isCod) {
        clearCart();
        toast.success(`Order placed! Pay ₹${total.toFixed(2)} on delivery.`);
        navigate('/account');
      } else if (paymentMethod === 'stripe') {
        setCurrentOrderId(order.id);
        setStep('payment');
      } else {
        // Razorpay auto-trigger
        await initiateRazorpayPayment(order.id, total, address);
      }
    } catch (err: any) {
      toast.error(err.message || 'Order failed');
    } finally {
      setProcessing(false);
    }
  };

  if (!user || !profile) return <Navigate to="/auth" replace />;
  if (items.length === 0) return <Navigate to="/cart" replace />;

  const currentAddress = addresses.find(a => a.id === selectedAddress);

  const productImages: Record<string, string> = {
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
                  <CardTitle className="flex items-center gap-2"><MapPin className="w-5 h-5" />1. Shipping Address</CardTitle>
                </CardHeader>
                <CardContent>
                  {showAddressForm ? (
                    <AddressForm onSubmit={handleAddressSubmit} onCancel={() => setShowAddressForm(false)} />
                  ) : (
                    <>
                      {addresses.length === 0 ? (
                        <div className="text-center py-8">
                          <p className="text-muted-foreground mb-4">No saved addresses</p>
                          <Button onClick={() => setShowAddressForm(true)}><Plus className="w-4 h-4 mr-2" />Add Address</Button>
                        </div>
                      ) : (
                        <>
                          <RadioGroup value={selectedAddress} onValueChange={setSelectedAddress}>
                            <div className="space-y-3">
                              {addresses.map(address => (
                                <div key={address.id} className="flex items-start space-x-3 border rounded-lg p-3">
                                  <RadioGroupItem value={address.id} id={address.id} />
                                  <Label htmlFor={address.id} className="flex-1 cursor-pointer">
                                    <p className="font-semibold">{address.full_name}</p>
                                    <p className="text-sm text-muted-foreground">{address.address_line1}{address.address_line2 && `, ${address.address_line2}`}</p>
                                    <p className="text-sm text-muted-foreground">{address.city}, {address.state} {address.postal_code}</p>
                                    <p className="text-sm text-muted-foreground">{address.phone}</p>
                                  </Label>
                                </div>
                              ))}
                            </div>
                          </RadioGroup>
                          <Button variant="outline" className="mt-4" onClick={() => setShowAddressForm(true)}>
                            <Plus className="w-4 h-4 mr-2" />Add New Address
                          </Button>
                        </>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>

              {selectedAddress && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2"><CreditCard className="w-5 h-5" />2. Payment Method</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {paymentMethod === 'stripe' && currentOrderId ? (
                      <StripePayment orderId={currentOrderId!} amount={total} onSuccess={() => { clearCart(); toast.success('Payment successful'); navigate('/account'); }} />
                    ) : (
                      <>
                        <RadioGroup value={paymentMethod} onValueChange={(v: any) => setPaymentMethod(v)} className="mb-4">
                          <div className="flex items-center space-x-2 border rounded-lg p-3">
                            <RadioGroupItem value="razorpay" id="razorpay" />
                            <Label htmlFor="razorpay" className="flex-1 cursor-pointer font-medium">Card / UPI / Netbanking (Razorpay)</Label>
                          </div>
                          <div className="flex items-center space-x-2 border rounded-lg p-3">
                            <RadioGroupItem value="stripe" id="stripe" />
                            <Label htmlFor="stripe" className="flex-1 cursor-pointer font-medium">Credit/Debit Card (Stripe)</Label>
                          </div>
                          <div className="flex items-center space-x-2 border rounded-lg p-3">
                            <RadioGroupItem value="cod" id="cod" />
                            <Label htmlFor="cod" className="flex-1 cursor-pointer font-medium">Cash on Delivery (₹{total.toFixed(2)})</Label>
                          </div>
                        </RadioGroup>
                        <Button className="w-full gradient-hero" onClick={handlePlaceOrder} disabled={processing || !currentAddress}>
                          {processing ? 'Processing...' : paymentMethod === 'cod' ? 'Place Order (COD)' : (
                            <>
                              <Lock className="w-4 h-4 mr-2" />Continue to Pay ₹{total.toFixed(2)}
                            </>
                          )}
                        </Button>
                      </>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>

            <div className="lg:col-span-1">
              <Card className="sticky top-24">
                <CardHeader><CardTitle>Order Summary</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-3 mb-4 max-h-64 overflow-y-auto pr-2">
                    {items.map((item) => {
                      const imgSrc = productImages[item.product.slug] || monsteraImg;
                      const price = (item.product.sale_price || item.product.base_price) + (item.variant?.price_adjustment || 0);
                      return (
                        <div key={`${item.product.id}-${item.variant?.id}`} className="flex gap-3">
                          <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted/50 flex-shrink-0">
                            <img src={imgSrc} alt={item.product.name} className="w-full h-full object-cover" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{item.product.name}</p>
                            {item.variant && <p className="text-xs text-muted-foreground">{item.variant.name}</p>}
                            <p className="text-sm">
                              <span className="text-muted-foreground">Qty: {item.quantity}</span>{' × '}
                              <span className="font-semibold">₹{price.toFixed(2)}</span>
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <Separator className="my-4" />
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm"><span className="text-muted-foreground">Subtotal</span><span className="font-semibold">₹{subtotal.toFixed(2)}</span></div>
                    {discountAmount > 0 && (
                      <div className="flex justify-between text-sm text-green-600">
                        <span className="text-muted-foreground flex items-center gap-1"><Percent className="w-3 h-3" /> Discount ({appliedCoupon?.code})</span>
                        <span className="font-semibold">-₹{discountAmount.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Shipping</span>
                      {shippingCost === 0 ? <span className="font-semibold text-green-600">FREE</span> : <span className="font-semibold">₹{shippingCost.toFixed(2)}</span>}
                    </div>
                    <Separator className="my-2" />
                    <div className="flex justify-between"><span className="font-semibold">Order Total</span><span className="font-bold text-lg">₹{total.toFixed(2)}</span></div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Checkout;
