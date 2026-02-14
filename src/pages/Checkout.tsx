// src/pages/Checkout.tsx
import { useState, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/hooks/useCart';
import { useBuyNow } from '@/hooks/useBuyNow';
import { supabase, SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from '@/integrations/supabase/client';
import { Address } from '@/types/database';
import { toast } from 'sonner';
import { Plus, MapPin, CreditCard, Percent, Lock, X, Eye, EyeOff } from 'lucide-react';
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
} from '@/components/ui/dialog';
import { trackPixelEvent } from '@/utils/pixel';

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface CheckoutAddress {
  full_name: string;
  phone: string;
  address_line1: string;
  address_line2?: string | null;
  city: string;
  state: string;
  postal_code: string;
  country?: string | null;
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
  const { user } = useAuth();
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

  // Guest checkout state
  const [guestEmail, setGuestEmail] = useState('');
  const [guestPassword, setGuestPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [guestAddress, setGuestAddress] = useState<CheckoutAddress>({
    full_name: '',
    phone: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    postal_code: '',
    country: 'India',
  });

  const isDirectBuy = isBuyNowFlow && buyNowItem;
  const items = isDirectBuy ? [buyNowItem] : cart.items;
  const isGuest = !user;

  useEffect(() => {
    if (user) fetchAddresses();
    loadRazorpayScript('https://checkout.razorpay.com/v1/checkout.js').then((loaded) => {
      setRazorpayLoaded(!!loaded);
    });

    return () => {
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
  const shippingCost = subtotal > 0 && subtotal < 799 ? 99 : 0;
  const discountAmount = isDirectBuy ? 0 : cart.getDiscountAmount();
  const total = subtotal + shippingCost - discountAmount;

  const hasValidDetails = isGuest
    ? Boolean(
      guestAddress.full_name &&
      guestAddress.address_line1 &&
      guestAddress.city &&
      guestAddress.state &&
      guestAddress.postal_code &&
      (guestAddress.phone || guestEmail),
    )
    : Boolean(selectedAddress);

  /**
   * Resolve a normalized checkout address from either:
   * - logged-in user's selected saved address, or
   * - guest's inline address form.
   */
  const getCheckoutAddress = (): CheckoutAddress => {
    if (isGuest) {
      return guestAddress;
    }

    const addr = addresses.find((a) => a.id === selectedAddress);
    if (!addr) {
      throw new Error('Selected address not found');
    }

    return {
      full_name: addr.full_name,
      phone: addr.phone,
      address_line1: addr.address_line1,
      address_line2: addr.address_line2,
      city: addr.city,
      state: addr.state,
      postal_code: addr.postal_code,
      country: addr.country,
    };
  };

  /**
   * Initiate Razorpay: opens checkout and verifies payment on success.
   * NOTE: does NOT clear cart. Cart clearing happens only after verification succeeds.
   */
  const initiateRazorpayPayment = async (
    orderId: string,
    totalAmount: number,
    address: CheckoutAddress,
  ) => {
    try {
      if (!razorpayLoaded) {
        toast.error('Payment gateway not loaded. Please refresh.');
        setProcessing(false);
        return false;
      }

      const createOrderResponse = await fetch(
        `${SUPABASE_URL}/functions/v1/create-razorpay-order`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ amount: totalAmount }),
        },
      );

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
          try {
            const verifyRes = await fetch(
              `${SUPABASE_URL}/functions/v1/verify-razorpay-payment`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
                },
                body: JSON.stringify({
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                  internal_order_id: orderId,
                }),
              },
            );

            const verifyData = await verifyRes.json();
            if (!verifyRes.ok || !verifyData.success) {
              throw new Error(verifyData.error || 'Payment verification failed');
            }

            if (isDirectBuy) {
              clearBuyNow();
            } else {
              cart.clearCart();
            }

            toast.success('Payment successful! Order confirmed.');
            setProcessing(false);

            // Facebook Pixel: Purchase
            trackPixelEvent('Purchase', {
              content_name: 'Order ' + orderId,
              content_type: 'product',
               // If feasible, list product IDs here; for now, we track the total order
              value: totalAmount,
              currency: 'INR',
              order_id: orderId,
            });

            navigate('/account');
          } catch (err: any) {
            console.error('Payment verification failed:', err);
            toast.error(
              `Payment verification failed: ${err?.message || 'unknown error'}`,
            );
            setProcessing(false);
          }
        },
        prefill: {
          name: address.full_name,
          email: user?.email || guestEmail || '',
          contact: address.phone,
        },
        theme: { color: '#4ADE80' },
        modal: {
          ondismiss: () => {
            setProcessing(false);
            toast.info('Payment was cancelled.');
          },
        },
      };

      const rzp = new window.Razorpay(options);

      rzp.on('payment.failed', (response: any) => {
        console.error('Payment failed:', response.error);
        toast.error(
          `Payment failed: ${response.error?.description || 'Unknown error'
          }`,
        );
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
   * Create order & order items in DB via Edge Function (works for logged-in + guests).
   */
  const createOrderRecord = async (
    address: CheckoutAddress,
    customerEmail: string | null,
    newUserId?: string | null,
  ) => {
    const shippingAddress = {
      ...address,
      pin: address.postal_code, // for Delhivery function compatibility
    };

    const orderItems = (items || []).map((item) => {
      const basePrice = item.product.sale_price || item.product.base_price;
      const variantAdjustment = item.variant?.price_adjustment || 0;
      const unitPrice = basePrice + variantAdjustment;

      return {
        product_id: item.product.id,
        variant_id: item.variant?.id || null,
        product_name: item.product.name,
        variant_name: item.variant?.name || null,
        quantity: item.quantity,
        unit_price: unitPrice,
        subtotal: unitPrice * item.quantity,
      };
    });

    const payload = {
      user_id: user?.id ?? newUserId ?? null,
      customer_email: customerEmail,
      customer_name: address.full_name,
      customer_phone: address.phone,
      shipping_address: shippingAddress,
      subtotal,
      discount_amount: discountAmount,
      shipping_cost: shippingCost,
      total,
      coupon_code: isDirectBuy ? null : cart.appliedCoupon?.code || null,
      payment_method: paymentMethod,
      items: orderItems,
    };

    const res = await fetch(`${SUPABASE_URL}/functions/v1/create-order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => null);

    if (!res.ok || !data?.order) {
      console.error('Order creation failed:', data?.error);
      throw new Error(data?.error || 'Order creation failed');
    }

    return data.order as { id: string };
  };

  const handlePlaceOrderClick = async () => {
    if (!items || items.length === 0) {
      toast.error('Your cart is empty.');
      return;
    }

    if (isGuest) {
      if (
        !guestAddress.full_name ||
        !guestAddress.address_line1 ||
        !guestAddress.city ||
        !guestAddress.state ||
        !guestAddress.postal_code
      ) {
        toast.error('Please fill your shipping details.');
        return;
      }

      if (!guestAddress.phone && !guestEmail) {
        toast.error('Please provide at least a phone number or an email.');
        return;
      }
    } else {
      if (!selectedAddress) {
        toast.error('Please select a shipping address.');
        return;
      }
    }

    // Facebook Pixel: AddPaymentInfo
    trackPixelEvent('AddPaymentInfo', {
      content_name: 'Checkout Payment',
      content_type: 'product',
      value: total,
      currency: 'INR',
      num_items: items.reduce((acc, item) => acc + item.quantity, 0),
      content_ids: items.map((item) => item.product.id),
      payment_method: paymentMethod,
    });

    if (paymentMethod === 'cod') {
      setIsCODDialogOpen(true);
    } else {
      await handleOnlinePaymentFlow();
    }
  };

  /**
   * Auto-create a Supabase account for guest users who provide email + password.
   * Returns the new user's ID if signup succeeds, null otherwise.
   */
  const autoSignupGuest = async (): Promise<string | null> => {
    if (!isGuest || !guestEmail || !guestPassword) return null;

    try {
      const { data, error } = await supabase.auth.signUp({
        email: guestEmail,
        password: guestPassword,
        options: {
          data: {
            full_name: guestAddress.full_name,
            phone: guestAddress.phone,
          },
        },
      });

      if (error) {
        console.error('Auto-signup failed:', error.message);
        toast.warning('Could not create account: ' + error.message + '. Continuing as guest.');
        return null;
      }

      const newUserId = data.user?.id || null;

      if (newUserId) {
        // Save address for the new user
        try {
          await supabase.from('addresses').insert([{
            user_id: newUserId,
            full_name: guestAddress.full_name,
            phone: guestAddress.phone,
            address_line1: guestAddress.address_line1,
            address_line2: guestAddress.address_line2 || null,
            city: guestAddress.city,
            state: guestAddress.state,
            postal_code: guestAddress.postal_code,
            country: guestAddress.country || 'India',
            is_default: true,
          }]);
        } catch (addrErr) {
          console.error('Failed to save address for new user:', addrErr);
        }

        toast.success('Account created! You can sign in with your email and password anytime.');
      }

      return newUserId;
    } catch (err) {
      console.error('Auto-signup error:', err);
      return null;
    }
  };

  const handleOnlinePaymentFlow = async () => {
    setProcessing(true);
    try {
      const address = getCheckoutAddress();
      const customerEmail = user?.email ?? (guestEmail || null);

      // Auto-signup guest if they provided email + password
      const newUserId = await autoSignupGuest();

      const order = await createOrderRecord(address, customerEmail, newUserId);
      await initiateRazorpayPayment(order.id, total, address);
    } catch (err: any) {
      console.error('Failed to start online payment:', err);
      toast.error(err?.message || 'Failed to start payment');
      setProcessing(false);
    }
  };

  const handleConfirmCOD = async () => {
    setProcessing(true);
    try {
      const address = getCheckoutAddress();
      const customerEmail = user?.email ?? (guestEmail || null);

      // Auto-signup guest if they provided email + password
      const newUserId = await autoSignupGuest();

      const order = await createOrderRecord(address, customerEmail, newUserId);

      try {
        const { error: funcError } = await supabase.functions.invoke('delhivery-create', {
          method: 'POST',
          body: JSON.stringify({ orderId: order.id }),
        });

        if (funcError) {
          console.error('Delhivery create function error:', funcError);
          // We don't block the order placement for this, but we log it.
          // Optionally, we could toast a warning, but the order IS placed locally.
          toast.warning('Order placed, but shipment creation failed. Support will assist.');
        }
      } catch (error) {
        console.error('Failed to create Delhivery shipment:', error);
      }

      if (isDirectBuy) {
        clearBuyNow();
      } else {
        cart.clearCart();
      }

      toast.success(
        `Order placed! ${paymentMethod === 'cod'
          ? `Pay ₹${total.toFixed(2)} on delivery.`
          : 'We will notify you with updates.'
        }`,
      );

      // Facebook Pixel: Purchase (COD)
      trackPixelEvent('Purchase', {
        content_name: 'Order ' + order.id,
        content_type: 'product',
        value: total,
        currency: 'INR',
        order_id: order.id,
      });

      setIsCODDialogOpen(false);
      setProcessing(false);
      navigate('/account');
    } catch (err: any) {
      console.error('Failed to place COD order:', err);
      toast.error(err?.message || 'Failed to place order');
      setProcessing(false);
    }
  };

  if (!items || items.length === 0) {
    return <Navigate to="/cart" replace />;
  }

  const productImages: Record<string, string> = {
    'monstera-deliciosa': monsteraImg,
    'snake-plant': snakePlantImg,
    pothos: pothosImg,
    'fiddle-leaf-fig': fiddleLeafImg,
  };

  return (
    <div className="min-h-screen pt-24 pb-12 bg-gradient-to-b from-muted/30 to-background">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-6xl mx-auto"
        >
          <div className="grid grid-cols-1 lg:grid-cols-[2fr,1fr] gap-8">
            {/* Left column: Address + Payment */}
            <div className="space-y-6">
              {/* Shipping Address */}
              <Card className="shadow-card">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <MapPin className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-xl font-serif">
                        Shipping Details
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {isGuest
                          ? 'Checkout as a guest with your address and contact info.'
                          : 'Choose where you’d like your plants delivered.'}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {isGuest ? (
                    <div className="space-y-4">
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="guest-full-name">Full Name</Label>
                          <Input
                            id="guest-full-name"
                            value={guestAddress.full_name}
                            onChange={(e) =>
                              setGuestAddress((prev) => ({
                                ...prev,
                                full_name: e.target.value,
                              }))
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="guest-phone">Phone Number</Label>
                          <Input
                            id="guest-phone"
                            type="tel"
                            value={guestAddress.phone}
                            onChange={(e) =>
                              setGuestAddress((prev) => ({
                                ...prev,
                                phone: e.target.value,
                              }))
                            }
                          />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                          <Label htmlFor="guest-email">Email</Label>
                          <Input
                            id="guest-email"
                            type="email"
                            placeholder="you@example.com"
                            value={guestEmail}
                            onChange={(e) => setGuestEmail(e.target.value)}
                          />
                        </div>
                      </div>

                      {/* Password field - shown when email is provided */}
                      {guestEmail && (
                        <div className="space-y-2">
                          <Label htmlFor="guest-password">Create Password</Label>
                          <div className="relative">
                            <Input
                              id="guest-password"
                              type={showPassword ? 'text' : 'password'}
                              placeholder="Min 6 characters"
                              value={guestPassword}
                              onChange={(e) => setGuestPassword(e.target.value)}
                              minLength={6}
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                              onClick={() => setShowPassword(!showPassword)}
                            >
                              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </Button>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            We'll create an account so you can track your orders. Min 6 characters.
                          </p>
                        </div>
                      )}

                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2 md:col-span-2">
                          <Label htmlFor="guest-address-line1">
                            Address Line 1
                          </Label>
                          <Input
                            id="guest-address-line1"
                            value={guestAddress.address_line1}
                            onChange={(e) =>
                              setGuestAddress((prev) => ({
                                ...prev,
                                address_line1: e.target.value,
                              }))
                            }
                          />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                          <Label htmlFor="guest-address-line2">
                            Address Line 2 (optional)
                          </Label>
                          <Input
                            id="guest-address-line2"
                            value={guestAddress.address_line2 || ''}
                            onChange={(e) =>
                              setGuestAddress((prev) => ({
                                ...prev,
                                address_line2: e.target.value,
                              }))
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="guest-city">City</Label>
                          <Input
                            id="guest-city"
                            value={guestAddress.city}
                            onChange={(e) =>
                              setGuestAddress((prev) => ({
                                ...prev,
                                city: e.target.value,
                              }))
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="guest-state">State</Label>
                          <Input
                            id="guest-state"
                            value={guestAddress.state}
                            onChange={(e) =>
                              setGuestAddress((prev) => ({
                                ...prev,
                                state: e.target.value,
                              }))
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="guest-postal-code">PIN Code</Label>
                          <Input
                            id="guest-postal-code"
                            value={guestAddress.postal_code}
                            onChange={(e) =>
                              setGuestAddress((prev) => ({
                                ...prev,
                                postal_code: e.target.value,
                              }))
                            }
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {addresses.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          No saved addresses yet. Add one below to continue.
                        </p>
                      ) : (
                        <RadioGroup
                          value={selectedAddress}
                          onValueChange={setSelectedAddress}
                          className="space-y-3"
                        >
                          {addresses.map((address) => (
                            <label
                              key={address.id}
                              className="flex items-start gap-3 p-3 rounded-lg border cursor-pointer hover:border-primary transition-smooth"
                            >
                              <RadioGroupItem value={address.id} />
                              <div className="flex-1">
                                <p className="font-medium">
                                  {address.full_name}
                                  {address.is_default && (
                                    <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                                      Default
                                    </span>
                                  )}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {address.address_line1}
                                  {address.address_line2 &&
                                    `, ${address.address_line2}`}
                                  , {address.city}, {address.state} -{' '}
                                  {address.postal_code}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  Phone: {address.phone}
                                </p>
                              </div>
                            </label>
                          ))}
                        </RadioGroup>
                      )}

                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2"
                        onClick={() => setShowAddressForm(true)}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add New Address
                      </Button>

                      {showAddressForm && (
                        <div className="mt-4 border rounded-lg p-4">
                          <AddressForm onSubmit={handleAddressSubmit} />
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Payment Method */}
              {(isGuest || selectedAddress) && (
                <Card className="shadow-card">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <CreditCard className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-xl font-serif">
                          Payment Method
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">
                          Choose how you’d like to pay.
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <RadioGroup
                      value={paymentMethod}
                      onValueChange={(value: 'razorpay' | 'cod') =>
                        setPaymentMethod(value)
                      }
                      className="space-y-3"
                    >
                      <label className="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:border-primary transition-smooth">
                        <div className="flex items-center gap-3">
                          <RadioGroupItem
                            value="razorpay"
                            id="razorpay"
                          />
                          <div>
                            <Label
                              htmlFor="razorpay"
                              className="flex items-center gap-2"
                            >
                              Pay Online (UPI / Card / Netbanking)
                            </Label>
                            <p className="text-xs text-muted-foreground">
                              Secure payment powered by Razorpay.
                            </p>
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          <Lock className="w-3 h-3" />
                          100% secure
                        </div>
                      </label>

                      <label className="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:border-primary transition-smooth">
                        <div className="flex items-center gap-3">
                          <RadioGroupItem value="cod" id="cod" />
                          <div>
                            <Label
                              htmlFor="cod"
                              className="flex items-center gap-2"
                            >
                              Cash on Delivery
                              <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                                Popular
                              </span>
                            </Label>
                            <p className="text-xs text-muted-foreground">
                              Pay when your plants arrive at your doorstep.
                            </p>
                          </div>
                        </div>
                      </label>
                    </RadioGroup>

                    <div className="flex items-center justify-between text-xs text-muted-foreground bg-muted/40 px-3 py-2 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Percent className="w-3 h-3 text-primary" />
                        <span>No extra fees for prepaid or COD.</span>
                      </div>
                    </div>

                    <Button
                      className="w-full mt-2"
                      size="lg"
                      onClick={handlePlaceOrderClick}
                      disabled={processing || !hasValidDetails}
                    >
                      {processing
                        ? 'Processing...'
                        : paymentMethod === 'cod'
                          ? `Place Order (Pay ₹${total.toFixed(2)} on delivery)`
                          : `Pay Securely ₹${total.toFixed(2)}`}
                    </Button>

                    <p className="text-xs text-muted-foreground text-center">
                      By clicking {paymentMethod === 'cod' ? 'Place Order' : 'Pay Securely'}, you agree to our{' '}
                      <span className="underline">Terms &amp; Conditions</span>{' '}
                      and{' '}
                      <span className="underline">Privacy Policy</span>.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Right column: Order Summary */}
            <div className="space-y-6">
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle className="text-xl font-serif">
                    Order Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3 max-h-[260px] overflow-y-auto pr-2">
                    {items.map((item, index) => {
                      if (!item) return null;
                      const product = item.product;
                      const productImg =
                        product.main_image_url ||
                        productImages[product.slug] ||
                        monsteraImg;
                      const basePrice =
                        product.sale_price || product.base_price;
                      const variantAdjustment =
                        item.variant?.price_adjustment || 0;
                      const itemPrice = basePrice + variantAdjustment;

                      return (
                        <div
                          key={`${product.id}-${item.variant?.id || 'base'}-${index}`}
                          className="flex gap-3"
                        >
                          <div className="w-16 h-16 rounded-md overflow-hidden bg-muted/40">
                            <img
                              src={productImg}
                              alt={product.main_image_alt || product.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium">
                              {product.name}
                            </p>
                            {item.variant && (
                              <p className="text-xs text-muted-foreground">
                                {item.variant.name}
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground">
                              Qty: {item.quantity}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold">
                              ₹{(itemPrice * item.quantity).toFixed(2)}
                            </p>
                            {product.sale_price && (
                              <p className="text-xs text-muted-foreground line-through">
                                ₹{(product.base_price * item.quantity).toFixed(2)}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <Separator />

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Subtotal</span>
                      <span>₹{subtotal.toFixed(2)}</span>
                    </div>
                    {discountAmount > 0 && (
                      <div className="flex justify-between text-emerald-600">
                        <span>Discount</span>
                        <span>-₹{discountAmount.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span>Shipping</span>
                      <span>
                        {shippingCost > 0 ? (
                          <>₹{shippingCost.toFixed(2)}</>
                        ) : (
                          <span className="text-emerald-600">Free</span>
                        )}
                      </span>
                    </div>
                    <Separator />
                    <div className="flex justify-between text-base font-semibold">
                      <span>Total</span>
                      <span>₹{total.toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="mt-4 p-3 bg-muted/40 rounded-lg text-xs text-muted-foreground">
                    <p>
                      ✅ 7-day healthy plant guarantee. If your plant arrives
                      damaged or unhealthy, we’ll replace it.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </motion.div>
      </div>

      {/* COD Confirmation Dialog */}
      <Dialog open={isCODDialogOpen} onOpenChange={setIsCODDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Cash on Delivery</DialogTitle>
            <DialogDescription>
              You&apos;ll pay ₹{total.toFixed(2)} in cash when your order is delivered.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 text-sm text-muted-foreground space-y-2">
            <p>
              Please ensure someone is available at the delivery address to
              receive the order and make the payment.
            </p>
            <p>
              Repeated failed delivery attempts may impact your ability to use
              COD in the future.
            </p>
          </div>
          <DialogFooter className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setIsCODDialogOpen(false)}
              disabled={processing}
            >
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button
              onClick={handleConfirmCOD}
              disabled={processing}
            >
              {processing ? 'Placing Order...' : 'Confirm COD Order'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Checkout;
