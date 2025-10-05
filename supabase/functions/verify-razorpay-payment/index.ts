// FILE: supabase/functions/verify-razorpay-payment/index.ts
import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';
import * as crypto from 'https://deno.land/std@0.224.0/crypto/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Use environment variables for Razorpay credentials
const RAZORPAY_KEY_SECRET = Deno.env.get('RAZORPAY_KEY_SECRET') || '';

// Utility function to verify the Razorpay signature
async function verifySignature(orderId: string, paymentId: string, signature: string): Promise<boolean> {
  const hmac = crypto.createHmac('sha256', RAZORPAY_KEY_SECRET);
  const data = `${orderId}|${paymentId}`;
  const generatedSignature = hmac.update(data).digest('hex');
  return generatedSignature === signature;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '' // Use service role key for order update
  );

  try {
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: userData } = await supabaseClient.auth.getUser(token);
    const user = userData.user;
    if (!user) throw new Error('User not authenticated');

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      orderId: dbOrderId, // Your database order ID
    } = await req.json();

    console.log(`Verifying Razorpay payment for DB Order ID: ${dbOrderId}`);

    const isVerified = await verifySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature);

    if (!isVerified) {
      console.log('Razorpay signature verification failed.');
      return new Response(
        JSON.stringify({ success: false, message: 'Payment verification failed (Invalid signature)' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    // Payment succeeded and signature verified, update your database order
    console.log('Payment succeeded and signature verified, updating order');

    const { error: updateError } = await supabaseClient
      .from('orders')
      .update({
        payment_status: 'paid',
        payment_intent_id: razorpay_payment_id,
        status: 'processing',
      })
      .eq('id', dbOrderId);

    if (updateError) {
      console.error('Error updating order:', updateError);
      throw updateError;
    }

    console.log('Order updated successfully');

    return new Response(
      JSON.stringify({ success: true, message: 'Payment verified and order updated' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error verifying Razorpay payment:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});