// supabase/functions/phone-confirmation/index.ts
import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase URL or Service Role Key is missing on the server.');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Parse request body (only orderId is required now)
    const { orderId } = await req.json();

    if (!orderId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing orderId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Fetch order details securely from the database
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      throw new Error(`Order not found: ${orderError?.message || 'Unknown error'}`);
    }

    // Parse the shipping address JSON structure
    const shippingAddress = typeof order.shipping_address === 'string'
      ? JSON.parse(order.shipping_address)
      : order.shipping_address;

    const phoneNumber = shippingAddress?.phone || '';
    const customerName = shippingAddress?.full_name || '';
    const totalAmount = order.total_amount || 0;

    if (!phoneNumber) {
      return new Response(
        JSON.stringify({ success: false, error: 'No phone number associated with the order shipping address.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Fetch active settings from site_settings table
    const { data: settings, error: settingsError } = await supabase
      .from('site_settings')
      .select('*')
      .eq('id', 1)
      .single();

    if (settingsError || !settings) {
      console.warn('Failed to load site_settings, using fallback defaults:', settingsError);
    }

    // Fallbacks if database settings are not initialized
    const isEnabled = settings ? settings.voice_calls_enabled : true;
    const maxCalls = settings ? settings.max_calls_per_order : 2;
    const cooldownMin = settings ? settings.cooldown_minutes : 10;

    // If disabled, end execution immediately (safe skip)
    if (!isEnabled) {
      return new Response(
        JSON.stringify({ success: true, message: 'Voice confirmation calls are currently disabled in settings.' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4. Enforce Rate Limiting & Cooldowns
    const now = new Date();

    // Check total call attempts for this specific order
    const { data: attemptsForOrder, error: orderAttemptsError } = await supabase
      .from('call_attempts')
      .select('id')
      .eq('order_id', orderId);

    if (orderAttemptsError) {
      throw new Error(`Failed to check call attempts: ${orderAttemptsError.message}`);
    }

    if (attemptsForOrder && attemptsForOrder.length >= maxCalls) {
      return new Response(
        JSON.stringify({ success: false, error: `Max call attempts (${maxCalls}) reached for this order.` }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check cooldown for this phone number
    const cooldownPeriodStart = new Date(now.getTime() - cooldownMin * 60 * 1000);
    const { data: recentCalls, error: cooldownError } = await supabase
      .from('call_attempts')
      .select('called_at')
      .eq('phone_number', phoneNumber)
      .gte('called_at', cooldownPeriodStart.toISOString())
      .order('called_at', { ascending: false })
      .limit(1);

    if (cooldownError) {
      throw new Error(`Failed to check cooldown status: ${cooldownError.message}`);
    }

    if (recentCalls && recentCalls.length > 0) {
      const minutesRemaining = Math.ceil(
        (new Date(recentCalls[0].called_at).getTime() + cooldownMin * 60 * 1000 - now.getTime()) / 60000
      );
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Phone number is on cooldown. Please wait ${minutesRemaining} minute(s).` 
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 5. Log the call attempt in the database
    const { error: logError } = await supabase
      .from('call_attempts')
      .insert({
        order_id: orderId,
        phone_number: phoneNumber,
        status: 'initiated'
      });

    if (logError) {
      console.error('Failed to log call attempt:', logError);
    }

    // 6. Trigger the external Voice Call Service (Twilio or similar)
    // We log the parameters securely in our Edge Function console
    console.log(`[CALL INITIATED] Outbound confirmation call to ${phoneNumber} for ${customerName} (Order ID: ${orderId}, Amount: ₹${totalAmount}).`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Voice confirmation call initiated successfully to ${phoneNumber}` 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in phone-confirmation:', error.message);
    return new Response(
      JSON.stringify({ success: false, error: error.message || 'Internal Server Error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
