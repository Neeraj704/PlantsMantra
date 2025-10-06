// src/components/RazorpayPayment.tsx
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
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

  useEffect(() => {
    loadScript('https://checkout.razorpay.com/v1/checkout.js').then((loaded) => {
      if (!loaded) {
        toast.error('Payment gateway failed to load. Please refresh.');
      }
    });
  }, []);

  const handlePayment = async () => {
    if (!user) return;
    setProcessing(true);

    try {
      // 1. Create a Razorpay Order ID on the backend
      const { data: orderData, error: orderError } = await supabase.functions.invoke(
        'create-razorpay-order',
        { body: { amount, orderId } }
      );

      if (orderError) throw new Error(orderError.message);
      if (!orderData?.razorpayOrderId) throw new Error('Failed to create Razorpay Order');

      // 2. Open the Razorpay Checkout Modal
      const options = {
        key: orderData.key,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'Verdant',
        description: `Order ID: ${orderId.slice(0, 8)}`,
        order_id: orderData.razorpayOrderId,
        handler: (response: any) => {
          // This function is called after successful payment
          onSuccess(); // The onSuccess from props will handle clearing cart and navigation
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
        toast.error(`Payment failed: ${response.error.description}`);
        setProcessing(false);
      });
      rzp1.open();
      // Don't set processing to false here, it's handled by the modal callbacks
    } catch (error: any) {
      toast.error(error.message || 'Failed to initiate checkout');
      setProcessing(false);
    }
  };

  return (
    <Button
      className="w-full gradient-hero"
      onClick={handlePayment}
      disabled={processing}
      size="lg"
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
  );
};