// supabase/functions/verify-razorpay-payment/index.ts
import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};
const RAZORPAY_KEY_SECRET = Deno.env.get('RAZORPAY_KEY_SECRET') || '';
serve(async (req)=>{
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, internal_order_id } = await req.json();
    // Validate inputs
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !internal_order_id) {
      throw new Error("Missing payment details for verification.");
    }
    if (!RAZORPAY_KEY_SECRET) {
      throw new Error("Razorpay secret key is not configured on the server.");
    }
    // Verify signature
    const bodyToSign = `${razorpay_order_id}|${razorpay_payment_id}`;
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey('raw', encoder.encode(RAZORPAY_KEY_SECRET), {
      name: 'HMAC',
      hash: 'SHA-256'
    }, false, [
      'sign'
    ]);
    const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(bodyToSign));
    const expectedSignature = Array.from(new Uint8Array(signatureBuffer)).map((b)=>b.toString(16).padStart(2, '0')).join('');
    if (expectedSignature !== razorpay_signature) {
      console.error('Signature mismatch:', {
        expected: expectedSignature,
        received: razorpay_signature
      });
      throw new Error("Invalid signature. Payment verification failed.");
    }
    // Update order in Supabase
    const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
    const { data, error } = await supabaseAdmin.from('orders').update({
      payment_status: 'paid',
      status: 'processing',
      payment_intent_id: razorpay_payment_id,
      updated_at: new Date().toISOString()
    }).eq('id', internal_order_id).select().single();
    if (error) {
      console.error('Supabase order update error:', error);
      throw new Error(`Failed to update order: ${error.message}`);
    }
    if (!data) {
      throw new Error('Order not found');
    }
    return new Response(JSON.stringify({
      success: true,
      order: data
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 200
    });
  } catch (error) {
    console.error('Error in verify-razorpay-payment:', error);
    return new Response(JSON.stringify({
      error: error.message || 'Payment verification failed'
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 400
    });
  }
});
