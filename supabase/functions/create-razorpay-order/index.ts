// supabase/functions/create-razorpay-order/index.ts
import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';
import Razorpay from 'https://esm.sh/razorpay@2.9.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Get secrets from environment variables
const RAZORPAY_KEY_ID = Deno.env.get('RAZORPAY_KEY_ID') || '';
const RAZORPAY_KEY_SECRET = Deno.env.get('RAZORPAY_KEY_SECRET') || '';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // **DEBUGGING STEP 1: Check if keys are loaded at all**
    console.log(`Razorpay Key ID Loaded: ${RAZORPAY_KEY_ID ? `Yes, starts with ${RAZORPAY_KEY_ID.substring(0, 8)}` : '!! NO !!'}`);
    console.log(`Razorpay Key Secret Loaded: ${RAZORPAY_KEY_SECRET ? 'Yes' : '!! NO !!'}`);

    if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
      throw new Error("Razorpay API keys are not configured in function secrets.");
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabaseClient.auth.getUser(token);
    if (!user) throw new Error('User not authenticated');

    const { amount, currency = 'INR', orderId } = await req.json();
    const amountInPaise = Math.round(amount * 100);

    const razorpay = new Razorpay({
      key_id: RAZORPAY_KEY_ID,
      key_secret: RAZORPAY_KEY_SECRET,
    });

    console.log(`Attempting to create Razorpay order for order ID: ${orderId}, amount: ${amountInPaise} paise`);

    // **DEBUGGING STEP 2: Wrap the API call in its own try/catch**
    try {
      const razorpayOrder = await razorpay.orders.create({
        amount: amountInPaise,
        currency,
        receipt: `order_rcptid_${orderId}`,
        metadata: { order_id: orderId, user_id: user.id },
      });

      console.log('Razorpay Order created successfully:', razorpayOrder.id);

      return new Response(
        JSON.stringify({
          razorpayOrderId: razorpayOrder.id,
          amount: razorpayOrder.amount,
          currency: razorpayOrder.currency,
          key: RAZORPAY_KEY_ID,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    } catch (razorpayError) {
      // This will catch the specific error from Razorpay
      console.error('!! ERROR during Razorpay API call !!:', JSON.stringify(razorpayError, null, 2));
      throw new Error(`Razorpay API Error: ${razorpayError.error?.description || 'An unknown error occurred with Razorpay'}`);
    }

  } catch (error) {
    console.error('Overall function error:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});