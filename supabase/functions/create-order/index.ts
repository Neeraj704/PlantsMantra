// supabase/functions/create-order/index.ts
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars");
}

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  global: {
    headers: {
      "x-plant-admin": "create-order",
    },
  },
});

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();

    const {
      user_id,
      customer_email,
      customer_name,
      customer_phone,
      shipping_address,
      subtotal,
      discount_amount,
      shipping_cost,
      total,
      coupon_code,
      payment_method,
      items,
    } = body ?? {};

    if (!items || !Array.isArray(items) || items.length === 0) {
      return new Response(
        JSON.stringify({ error: "Order must contain at least one item" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!payment_method || !["razorpay", "cod"].includes(payment_method)) {
      return new Response(
        JSON.stringify({ error: "Invalid payment method" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (typeof subtotal !== "number" || typeof total !== "number") {
      return new Response(
        JSON.stringify({ error: "Invalid totals supplied" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!shipping_address?.address_line1 ||
        !shipping_address?.city ||
        !shipping_address?.state ||
        !shipping_address?.postal_code) {
      return new Response(
        JSON.stringify({ error: "Incomplete shipping address" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!customer_email && !customer_phone) {
      return new Response(
        JSON.stringify({ error: "Either email or phone is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Ensure pin is present for Delhivery integration (uses shipping_address.pin)
    const shippingWithPin = {
      ...shipping_address,
      pin:
        shipping_address.pin ||
        shipping_address.postal_code ||
        shipping_address.pincode ||
        null,
    };

    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .insert({
        user_id: user_id || null,
        customer_email: customer_email || null,
        customer_name: customer_name || shippingWithPin.full_name || null,
        customer_phone: customer_phone || shippingWithPin.phone || null,
        shipping_address: shippingWithPin,
        subtotal,
        discount_amount: discount_amount ?? 0,
        shipping_cost: shipping_cost ?? 0,
        total,
        coupon_code: coupon_code || null,
        payment_method,
        status: "pending",
        payment_status: "checking",
      } as any)
      .select("*")
      .single();

    if (orderError || !order) {
      console.error("Order insert error:", orderError);
      return new Response(
        JSON.stringify({ error: "Failed to create order" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const orderItems = (items as any[]).map((item) => ({
      order_id: order.id,
      product_id: item.product_id,
      variant_id: item.variant_id ?? null,
      product_name: item.product_name,
      variant_name: item.variant_name ?? null,
      quantity: item.quantity,
      unit_price: item.unit_price,
      subtotal: item.subtotal,
    }));

    const { error: itemsError } = await supabaseAdmin
      .from("order_items")
      .insert(orderItems as any);

    if (itemsError) {
      console.error("Order items insert error:", itemsError);
      // Best-effort cleanup
      await supabaseAdmin.from("orders").delete().eq("id", order.id);
      return new Response(
        JSON.stringify({ error: "Failed to create order items" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ order }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("Unhandled create-order error:", e);
    return new Response(
      JSON.stringify({ error: "Unexpected error while creating order" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
