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
import { supabase } from '@/integrations/supabase/client';
import { Address } from '@/types/database';
import { toast } from 'sonner';
import { Plus, MapPin, CreditCard } from 'lucide-react';
import AddressForm from '@/components/AddressForm';
import { StripePayment } from '@/components/StripePayment';
import monsteraImg from '@/assets/monstera.jpg';
import snakePlantImg from '@/assets/snake-plant.jpg';
import pothosImg from '@/assets/pothos.jpg';
import fiddleLeafImg from '@/assets/fiddle-leaf.jpg';

const Checkout = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { items, getSubtotal, clearCart } = useCart();
  const [step, setStep] = useState<'shipping' | 'payment'>('shipping');
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<string>('');
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'stripe' | 'cod'>('stripe');

  const productImages: Record<string, string> = {
    'monstera-deliciosa': monsteraImg,
    'snake-plant': snakePlantImg,
    'pothos': pothosImg,
    'fiddle-leaf-fig': fiddleLeafImg,
  };

  useEffect(() => {
    if (user) {
      fetchAddresses();
    }
  }, [user]);

  const fetchAddresses = async () => {
    const { data } = await supabase
      .from('addresses' as any)
      .select('*')
      .eq('user_id', user?.id)
      .order('is_default', { ascending: false });
    
    if (data) {
      setAddresses(data as unknown as Address[]);
      const defaultAddr = data.find((a: any) => a.is_default);
      if (defaultAddr) setSelectedAddress((defaultAddr as any).id);
    }
  };

  const handleAddressSubmit = async () => {
    await fetchAddresses();
    setShowAddressForm(false);
  };

  const handlePlaceOrder = async (skipPayment = false) => {
    if (!selectedAddress) {
      toast.error('Please select a shipping address');
      return;
    }

    setProcessing(true);

    try {
      const address = addresses.find(a => a.id === selectedAddress);
      const subtotal = getSubtotal();
      
      const { data: order, error } = await supabase
        .from('orders' as any)
        .insert({
          user_id: user?.id,
          customer_email: user?.email,
          customer_name: address?.full_name,
          customer_phone: address?.phone,
          shipping_address: address,
          subtotal,
          discount_amount: 0,
          total: subtotal,
          status: 'pending',
          payment_status: skipPayment ? 'pending' : 'pending'
        } as any)
        .select()
        .single();

      if (error) throw error;

      // Insert order items
      const orderItems = items.map(item => ({
        order_id: (order as any).id,
        product_id: item.product.id,
        variant_id: item.variant?.id,
        product_name: item.product.name,
        variant_name: item.variant?.name,
        quantity: item.quantity,
        unit_price: item.product.sale_price || item.product.base_price,
        subtotal: (item.product.sale_price || item.product.base_price) * item.quantity
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      if (skipPayment) {
        clearCart();
        toast.success('Order placed successfully!');
        navigate('/account');
      } else {
        setCurrentOrderId((order as any).id);
        setStep('payment');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to place order');
    } finally {
      setProcessing(false);
    }
  };

  const handlePaymentSuccess = () => {
    clearCart();
    toast.success('Payment successful! Order confirmed.');
    navigate('/account');
  };

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (items.length === 0) {
    return <Navigate to="/cart" replace />;
  }

  return (
    <div className="min-h-screen pt-24 pb-12">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-6xl mx-auto"
        >
          <h1 className="text-4xl font-serif font-bold mb-8">Checkout</h1>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Steps */}
            <div className="lg:col-span-2 space-y-6">
              {/* Shipping Step */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="w-5 h-5" />
                    Shipping Address
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {showAddressForm ? (
                    <AddressForm
                      onSubmit={handleAddressSubmit}
                      onCancel={() => setShowAddressForm(false)}
                    />
                  ) : (
                    <>
                      {addresses.length === 0 ? (
                        <div className="text-center py-8">
                          <p className="text-muted-foreground mb-4">
                            No saved addresses
                          </p>
                          <Button onClick={() => setShowAddressForm(true)}>
                            <Plus className="w-4 h-4 mr-2" />
                            Add Address
                          </Button>
                        </div>
                      ) : (
                        <>
                          <RadioGroup value={selectedAddress} onValueChange={setSelectedAddress}>
                            <div className="space-y-3">
                              {addresses.map((address) => (
                                <div key={address.id} className="flex items-start space-x-3 border rounded-lg p-3">
                                  <RadioGroupItem value={address.id} id={address.id} />
                                  <Label htmlFor={address.id} className="flex-1 cursor-pointer">
                                    <p className="font-semibold">{address.full_name}</p>
                                    <p className="text-sm text-muted-foreground">
                                      {address.address_line1}
                                      {address.address_line2 && `, ${address.address_line2}`}
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                      {address.city}, {address.state} {address.postal_code}
                                    </p>
                                    <p className="text-sm text-muted-foreground">{address.phone}</p>
                                  </Label>
                                </div>
                              ))}
                            </div>
                          </RadioGroup>
                          <Button
                            variant="outline"
                            className="mt-4"
                            onClick={() => setShowAddressForm(true)}
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Add New Address
                          </Button>
                        </>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Payment Step */}
              {selectedAddress && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CreditCard className="w-5 h-5" />
                      Payment Method
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {!currentOrderId ? (
                      <>
                        <RadioGroup value={paymentMethod} onValueChange={(value: any) => setPaymentMethod(value)} className="mb-4">
                          <div className="flex items-center space-x-2 border rounded-lg p-3">
                            <RadioGroupItem value="stripe" id="stripe" />
                            <Label htmlFor="stripe" className="flex-1 cursor-pointer">
                              Credit/Debit Card (Stripe)
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2 border rounded-lg p-3">
                            <RadioGroupItem value="cod" id="cod" />
                            <Label htmlFor="cod" className="flex-1 cursor-pointer">
                              Cash on Delivery
                            </Label>
                          </div>
                        </RadioGroup>
                        <Button
                          className="w-full gradient-hero"
                          onClick={() => handlePlaceOrder(paymentMethod === 'cod')}
                          disabled={processing}
                        >
                          {processing ? 'Processing...' : paymentMethod === 'cod' ? 'Place Order (COD)' : 'Continue to Payment'}
                        </Button>
                      </>
                    ) : (
                      <StripePayment
                        orderId={currentOrderId}
                        amount={getSubtotal()}
                        onSuccess={handlePaymentSuccess}
                      />
                    )}
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Right Column - Order Summary */}
            <div className="lg:col-span-1">
              <Card className="sticky top-24">
                <CardHeader>
                  <CardTitle>Order Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 mb-4">
                    {items.map((item) => {
                      const imgSrc = productImages[item.product.slug] || monsteraImg;
                      const price = item.product.sale_price || item.product.base_price;
                      
                      return (
                        <div key={`${item.product.id}-${item.variant?.id}`} className="flex gap-3">
                          <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted/50 flex-shrink-0">
                            <img src={imgSrc} alt={item.product.name} className="w-full h-full object-cover" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{item.product.name}</p>
                            {item.variant && (
                              <p className="text-xs text-muted-foreground">{item.variant.name}</p>
                            )}
                            <p className="text-sm">
                              <span className="text-muted-foreground">Qty: {item.quantity}</span>
                              {' × '}
                              <span className="font-semibold">${price.toFixed(2)}</span>
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <Separator className="my-4" />

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span className="font-semibold">${getSubtotal().toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Shipping</span>
                      <span className="font-semibold">Free</span>
                    </div>
                    <Separator className="my-2" />
                    <div className="flex justify-between">
                      <span className="font-semibold">Total</span>
                      <span className="font-bold text-lg">${getSubtotal().toFixed(2)}</span>
                    </div>
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
