import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CreditCard, Lock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface StripePaymentProps {
  orderId: string;
  amount: number;
  onSuccess: () => void;
}

// Helper function to format the card number with spaces every 4 digits
const formatCardNumber = (value: string) => {
  // Remove non-digits and limit to 16 digits
  const cleanValue = value.replace(/\D/g, '').slice(0, 16);
  // Insert space every 4 digits
  return cleanValue.match(/.{1,4}/g)?.join(' ') || '';
};

// Helper function to format the expiry date as MM/YY
const formatExpiry = (value: string) => {
  // Remove non-digits and limit to 4 digits (MMYY)
  const cleanValue = value.replace(/\D/g, '').slice(0, 4);

  if (cleanValue.length >= 3) {
    // Insert '/' after the second digit
    return `${cleanValue.slice(0, 2)}/${cleanValue.slice(2)}`;
  }
  return cleanValue;
};

// Helper function to format CVC, enforcing max 4 digits
const formatCVC = (value: string) => {
  // Remove non-digits and limit to 4 digits
  return value.replace(/\D/g, '').slice(0, 4);
};

export const StripePayment = ({ orderId, amount, onSuccess }: StripePaymentProps) => {
  const [processing, setProcessing] = useState(false);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const [cardDetails, setCardDetails] = useState({
    name: '',
    number: '',
    expiry: '',
    cvc: '',
  });

  const handleCreatePaymentIntent = async () => {
    setProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-payment-intent', {
        body: { amount, orderId },
      });

      if (error) throw error;
      
      setPaymentIntentId(data.paymentIntentId);
      toast.success('Payment initiated');
      
      // Simulate payment processing (in production, use Stripe Elements)
      setTimeout(() => handleVerifyPayment(data.paymentIntentId), 2000);
    } catch (error: any) {
      toast.error(error.message || 'Failed to initiate payment');
      setProcessing(false);
    }
  };
  const handleVerifyPayment = async (paymentId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('verify-payment', {
        body: { paymentIntentId: paymentId, orderId },
      });

      if (error) throw error;

      if (data.success) {
        toast.success('Payment successful!');
        onSuccess();
      } else {
        // FIX: Explicitly check the returned status from the backend to guide the user.
        if (data.status === 'requires_payment_method') {
          toast.error(
            'Payment Incomplete. For guaranteed success, please use the Stripe test card number: 4242 4242 4242 0000.'
          );
        } else {
          toast.error('Payment verification failed. Status: ' + data.status);
        }
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to verify payment');
    } finally {
      setProcessing(false);
    }
  };

  // Validation checks (16 digits/19 chars for number, 5 chars for expiry, 3-4 chars for CVC)
  const isCardNumberValid = cardDetails.number.replace(/\s/g, '').length === 16;
  const isExpiryValid = cardDetails.expiry.length === 5;
  const isCvcValid = cardDetails.cvc.length >= 3;
  const isFormValid = isCardNumberValid && isExpiryValid && isCvcValid && cardDetails.name.trim().length > 0;

  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <CreditCard className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Payment Details</h3>
        </div>

        <div className="space-y-3">
          <div>
            <Label htmlFor="card-name">Cardholder Name</Label>
            <Input
              id="card-name"
              value={cardDetails.name}
              onChange={(e) => setCardDetails({ ...cardDetails, name: e.target.value })}
              placeholder="John Doe"
              disabled={processing}
            />
          </div>

          <div>
            <Label htmlFor="card-number">Card Number</Label>
            <Input
              id="card-number"
              // Added inputMode="numeric" for mobile friendly number input
              inputMode="numeric"
              value={cardDetails.number}
              // Used the formatCardNumber helper function
              onChange={(e) => setCardDetails({ ...cardDetails, number: formatCardNumber(e.target.value) })}
              placeholder="4242 4242 4242 4242"
              maxLength={19} // 16 digits + 3 spaces
              disabled={processing}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="expiry">Expiry Date</Label>
              <Input
                id="expiry"
                type="text" // Kept as text as formatExpiry ensures correct input but avoids browser default date picker
                inputMode="numeric"
                value={cardDetails.expiry}
                // Used the formatExpiry helper function
                onChange={(e) => setCardDetails({ ...cardDetails, expiry: formatExpiry(e.target.value) })}
                placeholder="MM/YY"
                maxLength={5} // MM/YY
                disabled={processing}
              />
            </div>
            <div>
              <Label htmlFor="cvc">CVC</Label>
              <Input
                id="cvc"
                type="text"
                inputMode="numeric"
                value={cardDetails.cvc}
                // Used the formatCVC helper function
                onChange={(e) => setCardDetails({ ...cardDetails, cvc: formatCVC(e.target.value) })}
                placeholder="123"
                maxLength={4}
                disabled={processing}
              />
            </div>
          </div>
        </div>

        <div className="pt-4">
          <Button
            className="w-full gradient-hero"
            onClick={handleCreatePaymentIntent}
            // Used the comprehensive validation logic
            disabled={processing || !isFormValid}
          >
            {processing ? (
              'Processing...'
            ) : (
              <>
                <Lock className="w-4 h-4 mr-2" />
                Pay ${amount.toFixed(2)}
              </>
            )}
          </Button>
          <p className="text-xs text-muted-foreground text-center mt-2">
            Secure payment powered by Stripe
          </p>
        </div>
      </CardContent>
    </Card>
  );
};