// FILE: src/components/RazorpayPayment.tsx
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { IndianRupee, Lock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

// Type definition for the Razorpay handler window object
declare global {
  interface Window {
    Razorpay: new (options: any) => any;
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

// Function to load the Razorpay SDK script dynamically
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
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);

  useEffect(() => {
    // Load Razorpay script only once
    const initRazorpay = async () => {
      const res = await loadScript('https://checkout.razorpay.com/v1/checkout.js');
      if (res) {
        setIsScriptLoaded(true);
      } else {
        toast.error('Razorpay SDK failed to load. Please refresh.');
      }
    };
    initRazorpay();
  }, []);

  const handlePayment = async () => {
    if (!isScriptLoaded || !user) return;
    setProcessing(true);

    try {
      // 1. Create a Razorpay Order ID on the backend
      const { data: orderData, error: orderError } = await supabase.functions.invoke(
        'create-razorpay-order',
        {
          body: { amount, orderId },
        }
      );

      if (orderError) throw new Error(orderError.message);
      if (!orderData?.razorpayOrderId) throw new Error('Failed to create Razorpay Order');

      // 2. Open the Razorpay Checkout Modal
      const options = {
        key: orderData.key,
        amount: orderData.amount, // amount in paise
        currency: orderData.currency,
        name: 'Verdant',
        description: `Order ID: ${orderId.slice(0, 8)}`,
        order_id: orderData.razorpayOrderId,
        handler: async (response: any) => {
          // This is executed upon successful payment
          setProcessing(true); // Re-enable loading state for verification
          try {
            // 3. Verify the payment on the backend
            const { data: verificationData, error: verificationError } = await supabase.functions.invoke(
              'verify-razorpay-payment',
              {
                body: {
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                  orderId: orderId, // Pass your database order ID
                },
              }
            );

            if (verificationError || !verificationData?.success) {
              throw new Error(verificationError?.message || 'Payment verification failed. Contact support with payment ID.');
            }

            toast.success('Payment successful! Order confirmed.');
            onSuccess();
          } catch (error: any) {
            console.error('Verification Error:', error);
            toast.error(error.message || 'Payment successful, but verification failed. Contact support.');
            setProcessing(false);
          }
        },
        prefill: {
          name: customerName,
          email: customerEmail,
          contact: customerPhone,
        },
        theme: {
          color: '#4ADE80', // Tailwind green-400, matches primary color in index.css
        },
      };

      const rzp1 = new window.Razorpay(options);
      rzp1.on('payment.failed', (response: any) => {
        toast.error(`Payment failed: ${response.error.description}`);
        setProcessing(false);
      });
      rzp1.open();

      // If the modal opens, remove the processing state. It will be re-enabled in the handler.
      setProcessing(false);

    } catch (error: any) {
      toast.error(error.message || 'Failed to initiate Razorpay checkout');
      setProcessing(false);
    }
  };

  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <IndianRupee className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Razorpay Payment</h3>
        </div>

        <Button
          className="w-full gradient-hero"
          onClick={handlePayment}
          disabled={processing || !isScriptLoaded}
        >
          {processing ? (
            'Processing...'
          ) : (
            <>
              <Lock className="w-4 h-4 mr-2" />
              Pay ₹{amount.toFixed(2)}
            </>
          )}
        </Button>
        <p className="text-xs text-muted-foreground text-center mt-2">
          Secure payment powered by Razorpay
        </p>
      </CardContent>
    </Card>
  );
};