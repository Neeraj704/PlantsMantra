// supabase/functions/verify-razorpay-payment/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createShipment } from "../lib/delhivery.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RAZORPAY_KEY_ID = Deno.env.get("RAZORPAY_KEY_ID")!;
const RAZORPAY_KEY_SECRET = Deno.env.get("RAZORPAY_KEY_SECRET")!;

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  global: { headers: { "x-verify-admin": "true" } },
});

async function verifyRazorpaySignature(razorpayOrderId: string, razorpayPaymentId: string, signature: string) {
  if (!RAZORPAY_KEY_SECRET) return false;
  const encoder = new TextEncoder();
  const msg = `${razorpayOrderId}|${razorpayPaymentId}`;
  const keyData = encoder.encode(RAZORPAY_KEY_SECRET);
  const msgData = encoder.encode(msg);

  const cryptoKey = await crypto.subtle.importKey("raw", keyData, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const rawSig = await crypto.subtle.sign("HMAC", cryptoKey, msgData);
  const sigHex = Array.from(new Uint8Array(rawSig)).map((b) => b.toString(16).padStart(2, "0")).join("");
  return sigHex === signature;
}

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
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature, orderId, internal_order_id } = body;

    // Accept both orderId and internal_order_id (frontend uses internal_order_id)
    const internalOrderId = orderId || internal_order_id;

    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature || !internalOrderId) {
      return new Response(JSON.stringify({ error: "Missing Razorpay fields" }), {
        status: 400,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    const validSig = await verifyRazorpaySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature);
    if (!validSig) {
      return new Response(JSON.stringify({ error: "Invalid Razorpay signature" }), {
        status: 401,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    const { data: order, error: orderErr } = await supabaseAdmin
      .from("orders")
      .select("*")
      .eq("id", internalOrderId)
      .single();

    if (orderErr || !order) {
      return new Response(JSON.stringify({ error: "Order not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    if (order.shipment_created_at) {
      return new Response(JSON.stringify({ message: "Shipment already created for order", order }), {
        status: 200,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    // Verify amount with Razorpay API
    const auth = btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`);
    const razorpayOrderRes = await fetch(`https://api.razorpay.com/v1/orders/${razorpay_order_id}`, {
      headers: { Authorization: `Basic ${auth}` },
    });

    if (!razorpayOrderRes.ok) {
      return new Response(JSON.stringify({ error: "Failed to fetch Razorpay order" }), {
        status: 502,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    const razorpayOrder = await razorpayOrderRes.json();
    const orderTotalPaise = Math.round(order.total * 100);

    if (razorpayOrder.amount !== orderTotalPaise) {
      return new Response(
        JSON.stringify({ error: "Amount mismatch", expected: orderTotalPaise, received: razorpayOrder.amount }),
        { status: 400, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
      );
    }

    if (razorpayOrder.status !== "paid") {
      return new Response(JSON.stringify({ error: "Payment not marked as paid in Razorpay" }), {
        status: 400,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    const shipping = order.shipping_address;
    // Check for both pin and postal_code (frontend stores as postal_code)
    const hasPin = shipping?.pin || shipping?.postal_code;
    if (!hasPin || !shipping?.city || !shipping?.state || !order.customer_name || !order.customer_phone) {
      await supabaseAdmin
        .from("orders")
        .update({ delhivery_response: { error: "Invalid address" } })
        .eq("id", internalOrderId);
      return new Response(JSON.stringify({ error: "Invalid shipping address" }), {
        status: 400,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    const itemsRaw = (await supabaseAdmin.from("order_items").select("*").eq("order_id", internalOrderId)).data || [];
    const items = itemsRaw.map((i: any) => ({
      name: i.product_name,
      qty: i.quantity,
      price: i.unit_price,
    }));

    const shipmentPayload = {
      order_id: order.id,
      customer_name: order.customer_name,
      customer_phone: order.customer_phone,
      address_line1: shipping.address_line1 || shipping.add,
      address_line2: shipping.address_line2 || "",
      city: shipping.city,
      state: shipping.state,
      pin: String(shipping.pin || shipping.postal_code),
      items,
      payment_mode: "Prepaid",
      cod_amount: 0,
    };

    const delhiveryRes = await createShipment(shipmentPayload as any);

    if (!delhiveryRes.ok) {
      await supabaseAdmin.from("orders").update({ delhivery_response: delhiveryRes.body }).eq("id", internalOrderId);
      return new Response(JSON.stringify({ error: "Failed to create shipment", details: delhiveryRes.body }), {
        status: 502,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    let awb = delhiveryRes?.body?.data?.shipments?.[0]?.waybill ||
              delhiveryRes?.body?.response?.waybill ||
              delhiveryRes?.body?.result?.waybill ||
              delhiveryRes?.body?.data?.lrn || null;

    const updateData: any = {
      courier: "Delhivery",
      shipment_status: "Pending",
      payment_status: "paid",
      delhivery_response: delhiveryRes.body,
      shipment_created_at: new Date().toISOString(),
    };
    if (awb) updateData.awb = awb;

    await supabaseAdmin.from("orders").update(updateData).eq("id", internalOrderId);

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