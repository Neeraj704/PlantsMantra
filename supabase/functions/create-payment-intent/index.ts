import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user?.email) throw new Error("User not authenticated");

    const { amount, orderId } = await req.json();
    
    console.log("Creating payment intent for order:", orderId, "amount:", amount);

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // 1. Check for existing customer
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    } else {
      const customer = await stripe.customers.create({ email: user.email });
      customerId = customer.id;
    }

    // 2. Create a Payment Method using a mock token
    const paymentMethod = await stripe.paymentMethods.create({
      type: 'card',
      card: { token: 'tok_visa' }, // 'tok_visa' is Stripe's standard test token
    });
    
    // 3. Create and Confirm the Payment Intent (Consolidated Logic)
    let paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: "usd",
      customer: customerId,
      payment_method: paymentMethod.id, // Attach the simulated payment method
      capture_method: 'automatic', // Use automatic capture
      confirm: true, // Auto-confirm the transaction immediately
      metadata: {
        orderId,
        userEmail: user.email,
      },
      // FIX: Disable redirects using automatic_payment_methods to satisfy the error.
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: 'never' 
      }
    });

    console.log("Payment intent created and confirmed. Final Status:", paymentIntent.status);

    // If Stripe requires an immediate action (which shouldn't happen with tok_visa), log the state.
    if (paymentIntent.status !== 'succeeded') {
      console.error(`Unexpected final status for mock payment: ${paymentIntent.status}`);
    }

    return new Response(
      JSON.stringify({ 
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id 
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error creating payment intent:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});