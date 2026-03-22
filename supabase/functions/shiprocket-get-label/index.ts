import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { fetchLabel as fetchDelhiveryLabel } from "../lib/delhivery.ts";
import { getToken, generateLabel as generateShiprocketLabel } from "../lib/shiprocket.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey, x-client-info",
};

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  global: { headers: { "x-verify-admin": "true" } },
});

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    let orderId = new URL(req.url).searchParams.get("orderId");
    let awbParam = new URL(req.url).searchParams.get("awb");

    if (!orderId && !awbParam && req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      orderId = body.orderId;
      awbParam = body.awb;
    }

    if (!orderId && !awbParam) {
      return new Response(JSON.stringify({ error: "orderId or awb required" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
    }

    let query = supabaseAdmin.from("orders").select("*");
    if (orderId) query = query.eq("id", orderId);
    else query = query.eq("shiprocket_awb", awbParam);

    const { data: orderList, error: orderErr } = await query.limit(1);
    const order = orderList?.[0];

    // Try finding by legacy awb if none found
    if ((orderErr || !order) && awbParam) {
        const { data: legacyList } = await supabaseAdmin.from("orders").select("*").eq("awb", awbParam).limit(1);
        if (legacyList?.[0]) {
             return handleLegacyOrder(legacyList[0]);
        }
    }

    if (orderErr || !order) {
      return new Response(JSON.stringify({ error: "Order not found" }), { status: 404, headers: { ...cors, "Content-Type": "application/json" } });
    }

    if (order.courier === 'Delhivery') {
       return handleLegacyOrder(order);
    }

    // Shiprocket logic
    if (order.shiprocket_label_url) {
       const res = await fetch(order.shiprocket_label_url);
       const blob = await res.blob();
       return new Response(blob, {
         status: 200,
         headers: {
           ...cors,
           "Content-Type": "application/pdf",
           "Content-Disposition": `attachment; filename="label-${order.shiprocket_awb || order.id}.pdf"`,
         }
       });
    }

    if (order.shiprocket_shipment_id) {
       const token = await getToken(supabaseAdmin);
       const labelRes = await generateShiprocketLabel(token, order.shiprocket_shipment_id);
       
       if (labelRes.label_created) {
           await supabaseAdmin.from("orders").update({ shiprocket_label_url: labelRes.label_url }).eq("id", order.id);
           const res = await fetch(labelRes.label_url);
           const blob = await res.blob();
           return new Response(blob, {
             status: 200,
             headers: {
               ...cors,
               "Content-Type": "application/pdf",
               "Content-Disposition": `attachment; filename="label-${order.shiprocket_awb || order.id}.pdf"`,
             }
           });
       }
       return new Response(JSON.stringify({ error: "Label not created yet in Shiprocket" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "No shipment ID found" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });

  } catch (err: any) {
    console.error("error in shiprocket-get-label", err);
    return new Response(JSON.stringify({ error: "Internal error", details: err.message }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" }
    });
  }
});

async function handleLegacyOrder(order: any) {
    if (!order.awb) {
      return new Response(JSON.stringify({ error: "No AWB found for legacy order" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
    }
    const labelRes = await fetchDelhiveryLabel(order.awb);
    if (!labelRes.ok) {
        return new Response(JSON.stringify({ error: "Failed to fetch legacy label", details: labelRes.error }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
    }
    return new Response(labelRes.buffer, {
        status: 200,
        headers: {
          ...cors,
          "Content-Type": labelRes.contentType,
          "Content-Disposition": `attachment; filename="label-${order.awb}.pdf"`,
        }
    });
}
