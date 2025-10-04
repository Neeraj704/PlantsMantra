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
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user) throw new Error("User not authenticated");

    const { paymentIntentId, orderId } = await req.json();
    
    console.log("Verifying payment:", paymentIntentId, "for order:", orderId);

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Retrieve payment intent
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    
    // FIX: Revert to strictly check for the required "succeeded" status for actual payment completion.
    if (paymentIntent.status === "succeeded") {
      console.log("Payment succeeded, updating order");
      
      // Update order status
      const { error: updateError } = await supabaseClient
        .from("orders")
        .update({
          payment_status: "paid",
          payment_intent_id: paymentIntentId,
          status: "processing",
        })
        .eq("id", orderId);

      if (updateError) {
        console.error("Error updating order:", updateError);
        throw updateError;
      }

      console.log("Order updated successfully");

      return new Response(
        JSON.stringify({ 
          success: true,
          message: "Payment verified and order updated" 
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    } else {
      console.log("Payment not succeeded:", paymentIntent.status);
      return new Response(
        JSON.stringify({ 
          success: false,
          message: "Payment verification failed", // Changed message
          status: paymentIntent.status 
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }
  } catch (error) {
    console.error("Error verifying payment:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
