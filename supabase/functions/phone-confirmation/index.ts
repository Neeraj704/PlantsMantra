import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  global: {
    headers: {
      "x-plant-admin": "phone-confirmation",
    },
  },
});

function normalizePhoneNumber(phone: string): string {
  let cleaned = phone.replace(/[^\d+]/g, '');
  if (cleaned.startsWith('+')) {
    return cleaned;
  }
  if (cleaned.startsWith('0') && cleaned.length === 11) {
    cleaned = cleaned.substring(1);
  }
  if (cleaned.length === 10) {
    return `+91${cleaned}`;
  }
  if (cleaned.length === 12 && cleaned.startsWith('91')) {
    return `+${cleaned}`;
  }
  if (!cleaned.startsWith('+')) {
    return `+${cleaned}`;
  }
  return cleaned;
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const action = url.searchParams.get("action");
  const orderId = url.searchParams.get("order_id");

  try {
    // -------------------------------------------------------------
    // ACTION: TRIGGER (Outbound call from client/checkout)
    // -------------------------------------------------------------
    if (action === "trigger") {
      const body = await req.json().catch(() => ({}));
      const requestOrderId = body.orderId || orderId;

      if (!requestOrderId) {
        return new Response(
          JSON.stringify({ error: "Missing order ID" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Fetch the order from database
      const { data: order, error: orderError } = await supabaseAdmin
        .from("orders")
        .select("*")
        .eq("id", requestOrderId)
        .single();

      if (orderError || !order) {
        console.error("Error fetching order:", orderError);
        return new Response(
          JSON.stringify({ error: "Order not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const phone = order.customer_phone;
      if (!phone) {
        return new Response(
          JSON.stringify({ error: "Customer phone number is missing from order" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const twilioAccountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
      const twilioAuthToken = Deno.env.get("TWILIO_AUTH_TOKEN");
      const twilioPhoneNumber = Deno.env.get("TWILIO_PHONE_NUMBER");

      if (!twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber) {
        console.error("Missing Twilio credentials in environment");
        // Dev bypass if credentials are missing
        return new Response(
          JSON.stringify({
            success: true,
            mocked: true,
            message: "Missing Twilio credentials. Simulation mode: Call triggered (Mocked).",
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const toPhone = normalizePhoneNumber(phone);
      const webhookUrl = `${SUPABASE_URL}/functions/v1/phone-confirmation?action=twiml&order_id=${requestOrderId}`;

      // Call Twilio REST API
      const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Calls.json`;
      const response = await fetch(twilioUrl, {
        method: "POST",
        headers: {
          Authorization: "Basic " + btoa(`${twilioAccountSid}:${twilioAuthToken}`),
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          To: toPhone,
          From: twilioPhoneNumber,
          Url: webhookUrl,
          Method: "POST",
        }).toString(),
      });

      const resData = await response.json();
      if (!response.ok) {
        console.error("Twilio API Error:", resData);
        return new Response(
          JSON.stringify({ error: resData.message || "Failed to initiate call via Twilio" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Update payment_status to 'calling' or log it
      await supabaseAdmin
        .from("orders")
        .update({ payment_status: "calling" } as any)
        .eq("id", requestOrderId);

      return new Response(
        JSON.stringify({ success: true, callSid: resData.sid, message: "Call initiated successfully" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // -------------------------------------------------------------
    // ACTION: TWIML (Twilio webhook prompt generation)
    // -------------------------------------------------------------
    if (action === "twiml") {
      if (!orderId) {
        return new Response("Missing order_id", { status: 400 });
      }

      const responseUrl = `${SUPABASE_URL}/functions/v1/phone-confirmation?action=respond&order_id=${orderId}`;

      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather numDigits="1" action="${responseUrl}" method="POST" timeout="10">
    <Say voice="alice" language="en-IN">This call is for the confirmation of your order at Plants Mantra. Press 1 to confirm your order, press 2 to cancel.</Say>
    <Say voice="alice" language="hi-IN">यह कॉल आपके प्लांट्स मंत्रा ऑर्डर की पुष्टि के लिए है। ऑर्डर की पुष्टि के लिए एक दबाएं, ऑर्डर रद्द करने के लिए दो दबाएं।</Say>
  </Gather>
  <Say voice="alice" language="en-IN">We did not receive any input. Goodbye.</Say>
  <Say voice="alice" language="hi-IN">हमें कोई इनपुट नहीं मिला। अलविदा।</Say>
</Response>`;

      return new Response(xml, {
        headers: {
          "Content-Type": "application/xml; charset=utf-8",
        },
      });
    }

    // -------------------------------------------------------------
    // ACTION: RESPOND (Twilio webhook response handler)
    // -------------------------------------------------------------
    if (action === "respond") {
      if (!orderId) {
        return new Response("Missing order_id", { status: 400 });
      }

      const bodyText = await req.text();
      const params = new URLSearchParams(bodyText);
      const digits = params.get("Digits");

      console.log(`Call confirmation response for Order ${orderId}: Digits = ${digits}`);

      let xml = "";

      if (digits === "1") {
        // Update order status to 'processing' and payment_status to 'confirmed_via_call'
        const { error } = await supabaseAdmin
          .from("orders")
          .update({
            status: "processing",
            payment_status: "confirmed_via_call",
          } as any)
          .eq("id", orderId);

        if (error) console.error("Database update error:", error);

        xml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice" language="en-IN">Thank you. Your order has been confirmed and is now being processed.</Say>
  <Say voice="alice" language="hi-IN">धन्यवाद। आपका ऑर्डर कंफर्म हो गया है और अब आगे की प्रक्रिया में है।</Say>
</Response>`;
      } else if (digits === "2") {
        // Update order status to 'cancelled'
        const { error } = await supabaseAdmin
          .from("orders")
          .update({
            status: "cancelled",
            payment_status: "cancelled_via_call",
            cancelled_at: new Date().toISOString(),
            cancellation_reason: "Cancelled by customer during automated call",
          } as any)
          .eq("id", orderId);

        if (error) console.error("Database update error:", error);

        xml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice" language="en-IN">Your order has been successfully cancelled. Thank you.</Say>
  <Say voice="alice" language="hi-IN">आपका ऑर्डर रद्द कर दिया गया है। धन्यवाद।</Say>
</Response>`;
      } else {
        // Invalid digit pressed
        xml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice" language="en-IN">Invalid option selected. Goodbye.</Say>
  <Say voice="alice" language="hi-IN">अमान्य विकल्प चुना गया। अलविदा।</Say>
</Response>`;
      }

      return new Response(xml, {
        headers: {
          "Content-Type": "application/xml; charset=utf-8",
        },
      });
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (e: any) {
    console.error("Unhandled error in phone-confirmation:", e);
    return new Response(
      JSON.stringify({ error: e.message || "Unexpected internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
