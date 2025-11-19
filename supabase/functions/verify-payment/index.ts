// supabase/functions/verify-payment/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@13.10.0";
import { createShipment } from "../lib/delhivery.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY") || "";

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  global: { headers: { "x-verify-admin": "true" } },
});

const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2022-11-15" });

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { paymentIntentId, orderId } = body;

    if (!paymentIntentId || !orderId) {
      return new Response(JSON.stringify({ error: "paymentIntentId and orderId required" }), {
        status: 400,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    // 1. Retrieve payment intent from Stripe
    let paymentIntent: any = null;
    try {
      paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    } catch (err: any) {
      return new Response(
        JSON.stringify({
          error: "Failed to retrieve payment intent",
          details: err.message,
        }),
        { status: 502, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
      );
    }

    if (paymentIntent.status !== "succeeded") {
      return new Response(JSON.stringify({ error: "Payment not successful" }), {
        status: 400,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    // 2. Fetch order from DB
    const { data: order, error: orderErr } = await supabaseAdmin
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .single();

    if (orderErr || !order) {
      return new Response(JSON.stringify({ error: "Order not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    // 3. Critical: Verify amount (Rupees * 100 = Cents)
    const orderTotalCents = Math.round(order.total * 100);
    const amountReceived = paymentIntent.amount_received;

    if (amountReceived !== orderTotalCents) {
      return new Response(
        JSON.stringify({
          error: "Amount mismatch",
          expected: orderTotalCents,
          received: amountReceived,
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        }
      );
    }

    if (order.shipment_created_at) {
      return new Response(JSON.stringify({ message: "Shipment already created for order", order }), {
        status: 200,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    const shipping = order.shipping_address;
    if (!shipping?.pin || !shipping?.city || !shipping?.state || !order.customer_name || !order.customer_phone) {
      await supabaseAdmin
        .from("orders")
        .update({ delhivery_response: { error: "Invalid address for shipment" } })
        .eq("id", orderId);

      return new Response(JSON.stringify({ error: "Invalid shipping address" }), {
        status: 400,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    // Fetch & map items
    const itemsRaw = (
      await supabaseAdmin.from("order_items").select("*").eq("order_id", orderId)
    ).data || [];

    const items = itemsRaw.map((i: any) => ({
      name: i.product_name,
      qty: i.quantity,
      price: i.unit_price,
    }));

    const shipmentPayload = {
      order_id: order.id,
      customer_name: order.customer_name,
      customer_phone: order.customer_phone,
      address_line1: shipping.address_line1 || shipping.add || "",
      address_line2: shipping.address_line2 || "",
      city: shipping.city,
      state: shipping.state,
      pin: String(shipping.pin),
      items,
      payment_mode: "Prepaid",
      cod_amount: 0,
    };

    const delhiveryRes = await createShipment(shipmentPayload as any);

    if (!delhiveryRes.ok) {
      await supabaseAdmin.from("orders").update({ delhivery_response: delhiveryRes.body }).eq("id", orderId);
      return new Response(JSON.stringify({ error: "Failed to create shipment", details: delhiveryRes.body }), {
        status: 502,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    let awb: string | null = null;
    try {
      awb = delhiveryRes?.body?.data?.shipments?.[0]?.waybill ||
            delhiveryRes?.body?.response?.waybill ||
            delhiveryRes?.body?.result?.waybill ||
            delhiveryRes?.body?.data?.lrn || null;
    } catch (_) { awb = null; }

    const updateData: any = {
      courier: "Delhivery",
      delhivery_response: delhiveryRes.body,
      shipment_created_at: new Date().toISOString(),
      shipment_status: "Pending",
    };
    if (awb) updateData.awb = awb;

    await supabaseAdmin.from("orders").update(updateData).eq("id", orderId);

    return new Response(JSON.stringify({ ok: true, awb, delhiveryRes }), {
      status: 200,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: "Internal error", message: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }
});