// src/components/RazorpayPayment.tsx

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Lock } from 'lucide-react';

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface RazorpayPaymentProps {
  orderId: string;
  amount: number;
  onSuccess: () => void;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
}

const loadScript = (src: string) => {
  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = src;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

export const RazorpayPayment = ({
  orderId,
  amount,
  onSuccess,
  customerName,
  customerEmail,
  customerPhone,
}: RazorpayPaymentProps) => {
  const { user } = useAuth();
  const [processing, setProcessing] = useState(false);
  const [scriptLoaded, setScriptLoaded] = useState(false);

  useEffect(() => {
    loadScript('https://checkout.razorpay.com/v1/checkout.js').then((loaded) => {
      if (!loaded) {
        toast.error('Payment gateway failed to load. Please refresh.');
        setScriptLoaded(false);
      } else {
        setScriptLoaded(true);
      }
    });
  }, []);

  const handlePayment = async () => {
    if (!user) {
      toast.error('Please login to continue');
      return;
    }

    if (!scriptLoaded) {
      toast.error('Payment gateway is still loading. Please wait.');
      return;
    }

    setProcessing(true);

    try {
      // 1. Create a Razorpay Order ID on the backend using fetch
      const createOrderResponse = await fetch(
        `${SUPABASE_URL}/functions/v1/create-razorpay-order`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ amount })
        }
      );

      if (!createOrderResponse.ok) {
        const errorData = await createOrderResponse.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to create payment order (${createOrderResponse.status})`);
      }

      const orderData = await createOrderResponse.json();

      if (!orderData?.razorpayOrderId || !orderData?.key) {
        throw new Error('Invalid response from payment server');
      }

      // 2. Open the Razorpay Checkout Modal
      const options = {
        key: orderData.key,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'Verdant',
        description: `Order ID: ${orderId.slice(0, 8)}`,
        order_id: orderData.razorpayOrderId,
        handler: async (response: any) => {
          // 3. VERIFY the payment on your backend
          try {
            const verifyResponse = await fetch(
              `${SUPABASE_URL}/functions/v1/verify-razorpay-payment`,
              {
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
                })
              }
            );

            const verifyData = await verifyResponse.json();

            if (!verifyResponse.ok || !verifyData.success) {
              throw new Error(verifyData.error || 'Payment verification failed');
            }

            // 4. Verification successful, call onSuccess
            onSuccess();

          } catch (verifyError: any) {
            console.error('Payment verification error:', verifyError);
            toast.error(`Payment verification failed: ${verifyError.message}`);
            setProcessing(false);
          }
        },
        prefill: {
          name: customerName,
          email: customerEmail,
          contact: customerPhone,
        },
        theme: {
          color: '#4ADE80',
        },
        modal: {
          ondismiss: () => {
            setProcessing(false);
            toast.info("Payment was cancelled.");
          }
        }
      };

      const rzp1 = new window.Razorpay(options);
      
      rzp1.on('payment.failed', (response: any) => {
        console.error('Payment failed:', response.error);
        toast.error(`Payment failed: ${response.error.description}`);
        setProcessing(false);
      });
      
      rzp1.open();

    } catch (error: any) {
      console.error('Payment initiation error:', error);
      toast.error(error.message || 'Failed to initiate checkout');
      setProcessing(false);
    }
  };

  return (
    <Button
      className="w-full gradient-hero"
      onClick={handlePayment}
      disabled={processing || !scriptLoaded}
      size="lg"
    >
      {processing ? (
        'Processing...'
      ) : !scriptLoaded ? (
        'Loading Payment Gateway...'
      ) : (
        <>
          <Lock className="w-4 h-4 mr-2" />
          Pay ₹{amount.toFixed(2)}
        </>
      )}
    </Button>
  );
};