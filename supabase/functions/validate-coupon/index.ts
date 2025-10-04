import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { code, cartTotal } = await req.json();

    console.log(`Validating coupon: ${code} for cart total: ${cartTotal}`);

    // Fetch coupon
    const { data: coupon, error } = await supabase
      .from('coupons')
      .select('*')
      .eq('code', code.toUpperCase())
      .single();

    if (error || !coupon) {
      console.log('Coupon not found');
      return new Response(
        JSON.stringify({ valid: false, message: 'Coupon not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    // Check if active
    if (!coupon.is_active) {
      console.log('Coupon is not active');
      return new Response(
        JSON.stringify({ valid: false, message: 'Coupon is not active' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Check validity dates
    const now = new Date();
    const validFrom = new Date(coupon.valid_from);
    const validUntil = coupon.valid_until ? new Date(coupon.valid_until) : null;

    if (now < validFrom) {
      console.log('Coupon is not yet valid');
      return new Response(
        JSON.stringify({ valid: false, message: 'Coupon is not yet valid' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    if (validUntil && now > validUntil) {
      console.log('Coupon has expired');
      return new Response(
        JSON.stringify({ valid: false, message: 'Coupon has expired' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Check usage limit
    if (coupon.max_uses && coupon.used_count >= coupon.max_uses) {
      console.log('Coupon usage limit reached');
      return new Response(
        JSON.stringify({ valid: false, message: 'Coupon usage limit reached' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Check minimum purchase
    if (cartTotal < coupon.min_purchase) {
      console.log(`Cart total ${cartTotal} is below minimum purchase ${coupon.min_purchase}`);
      return new Response(
        JSON.stringify({
          valid: false,
          message: `Minimum purchase of $${coupon.min_purchase} required`
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Calculate discount
    let discountAmount = 0;
    if (coupon.discount_type === 'percentage') {
      discountAmount = (cartTotal * coupon.discount_value) / 100;
    } else {
      discountAmount = coupon.discount_value;
    }

    console.log(`Coupon valid. Discount: $${discountAmount}`);

    return new Response(
      JSON.stringify({
        valid: true,
        discount: discountAmount,
        coupon: {
          code: coupon.code,
          discountType: coupon.discount_type,
          discountValue: coupon.discount_value
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error validating coupon:', error);
    return new Response(
      JSON.stringify({ valid: false, message: 'Internal server error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
