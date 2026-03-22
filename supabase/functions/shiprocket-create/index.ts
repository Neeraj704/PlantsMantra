import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getToken, createOrder, assignAWB, generateLabel } from "../lib/shiprocket.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey, x-client-info",
};

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  global: { headers: { "x-verify-admin": "true" } },
});

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const { orderId } = await req.json().catch(() => ({}));
    if (!orderId) {
      return new Response(JSON.stringify({ error: "orderId required" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
    }

    const { data: order, error: orderErr } = await supabaseAdmin.from("orders").select("*").eq("id", orderId).single();
    if (orderErr || !order) {
      return new Response(JSON.stringify({ error: "Order not found" }), { status: 404, headers: { ...cors, "Content-Type": "application/json" } });
    }

    if (order.shiprocket_order_id && order.shiprocket_awb) {
       return new Response(JSON.stringify({ ok: true, message: "already_created" }), { status: 200, headers: { ...cors, "Content-Type": "application/json" } });
    }

    const isCOD = order.payment_method?.toLowerCase() === "cod";
    if (!isCOD) {
      const paid = ["paid", "captured", "succeeded"];
      if (!paid.includes((order.payment_status || "").toLowerCase())) {
        return new Response(JSON.stringify({ error: "Prepaid order is unpaid" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
      }
    }

    const shipping = order.shipping_address || {};
    const pinCode = shipping.postal_code || shipping.pin;
    if (!pinCode || (!/^\d{6}$/.test(String(pinCode))) || !shipping.city || !shipping.state || !order.customer_name || !order.customer_phone) {
      return new Response(JSON.stringify({ error: "Invalid shipping address data" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
    }

    const itemsRaw = (await supabaseAdmin.from("order_items").select("*").eq("order_id", orderId)).data || [];
    const items = itemsRaw.map((i: any) => ({
      name: i.product_name,
      sku: i.product_id ? String(i.product_id).substring(0, 8) : "ITEM",
      units: i.quantity,
      selling_price: Number(i.unit_price) // mapped from order_items (product_name, quantity, unit_price)
    }));

    const channelId = Deno.env.get("SHIPROCKET_CHANNEL_ID");
    if (!channelId) throw new Error("SHIPROCKET_CHANNEL_ID not set");

    const payload = {
      order_id: String(order.id).replace(/-/g, '').substring(0, 30),
      order_date: new Date(order.created_at).toISOString().replace("T", " ").substring(0, 16),
      channel_id: channelId,
      billing_customer_name: order.customer_name,
      billing_last_name: "",
      billing_address: shipping.address_line1 || shipping.city,
      billing_address_2: shipping.address_line2 || "",
      billing_city: shipping.city,
      billing_pincode: String(pinCode),
      billing_state: shipping.state,
      billing_country: "India",
      billing_email: order.customer_email || "",
      billing_phone: order.customer_phone,
      shipping_is_billing: true,
      order_items: items,
      payment_method: isCOD ? "COD" : "Prepaid",
      sub_total: Number(order.subtotal),
      length: 15, breadth: 15, height: 15,
      weight: parseFloat(Deno.env.get("SHIPROCKET_DEFAULT_WEIGHT") || "0.5"),
      pickup_location: Deno.env.get("SHIPROCKET_PICKUP_LOCATION") || "Primary"
    };

    const token = await getToken(supabaseAdmin);
    let shiprocketOrderId = order.shiprocket_order_id;
    let shipmentId = order.shiprocket_shipment_id;
    let createRes = null;

    if (!shiprocketOrderId) {
      createRes = await createOrder(token, payload);
      if (!createRes.order_id) {
        // Order creation failed, return the error details directly 
        return new Response(JSON.stringify({ error: "Shiprocket order creation failed", details: createRes }), { 
          status: 400, 
          headers: { ...cors, "Content-Type": "application/json" } 
        });
      }
      shiprocketOrderId = createRes.order_id;
      shipmentId = createRes.shipment_id;
    }

    let awb = order.shiprocket_awb;
    let courierName = order.shiprocket_courier_name;
    let assignRes = null;

    if (!awb && shipmentId) {
      assignRes = await assignAWB(token, shipmentId);
      if (assignRes.response && assignRes.response.data) {
        awb = assignRes.response.data.awb_code;
        courierName = assignRes.response.data.courier_name;
      }
    }

    let labelUrl = order.shiprocket_label_url;
    let trackingUrl = null;
    if (awb && shipmentId) {
       trackingUrl = `https://shiprocket.co/tracking/${awb}`;
       try {
         const labelRes = await generateLabel(token, shipmentId);
         if (labelRes.label_created) labelUrl = labelRes.label_url;
       } catch (e) {
         console.error("Label generation failed but awb assigned", e);
       }
    }

    const updates = {
      courier: "Shiprocket",
      shipment_status: "Pending",
      shiprocket_order_id: shiprocketOrderId,
      shiprocket_shipment_id: shipmentId,
      shiprocket_channel_id: parseInt(channelId, 10),
      shiprocket_awb: awb,
      shiprocket_courier_name: courierName,
      shiprocket_label_url: labelUrl,
      shiprocket_tracking_url: trackingUrl,
      shiprocket_created_at: new Date().toISOString(),
      shiprocket_response: createRes || order.shiprocket_response,
      shipment_created_at: new Date().toISOString(),
    };

    await supabaseAdmin.from("orders").update(updates).eq("id", orderId);

    return new Response(JSON.stringify({ ok: true, shiprocketOrderId, shipmentId, awb, courierName, labelUrl, trackingUrl }), {
        status: 200, headers: { ...cors, "Content-Type": "application/json" }
    });
  } catch (err: any) {
    console.error("error in shiprocket-create", err);
    return new Response(JSON.stringify({ error: "Internal error", details: err.message }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" }
    });
  }
});
