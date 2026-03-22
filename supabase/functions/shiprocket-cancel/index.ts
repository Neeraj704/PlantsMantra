import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { cancelShipment as cancelDelhivery } from "../lib/delhivery.ts";
import { getToken, cancelOrder as cancelShiprocket } from "../lib/shiprocket.ts";

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

    // Branch: Legacy Delhivery
    if (order.courier === 'Delhivery') {
       if (!order.awb) {
         return new Response(JSON.stringify({ error: "No AWB found for legacy order" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
       }
       const delhiveryRes = await cancelDelhivery(order.awb);
       await supabaseAdmin.from("orders").update({
         shipment_cancelled_at: new Date().toISOString(),
         shipment_status: "Cancelled"
       }).eq("id", orderId);
       return new Response(JSON.stringify({ ok: true, message: "Legacy shipment cancelled", details: delhiveryRes }), { status: 200, headers: { ...cors, "Content-Type": "application/json" } });
    }

    // Branch: Shiprocket
    if (order.shiprocket_order_id) {
       const token = await getToken(supabaseAdmin);
       const shiprocketRes = await cancelShiprocket(token, [order.shiprocket_order_id]);
       await supabaseAdmin.from("orders").update({
         shiprocket_cancelled_at: new Date().toISOString(),
         shipment_status: "Cancelled"
       }).eq("id", orderId);
       return new Response(JSON.stringify({ ok: true, message: "Shipment cancelled", details: shiprocketRes }), { status: 200, headers: { ...cors, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "No shipment found to cancel" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });

  } catch (err: any) {
    console.error("error in shiprocket-cancel", err);
    return new Response(JSON.stringify({ error: "Internal error", details: err.message }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" }
    });
  }
});
