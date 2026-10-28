import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { cancelShipment as cancelDelhivery } from "../lib/delhivery.ts";
import { getToken, cancelOrder as cancelShiprocket, cancelShipmentAwb, searchOrders } from "../lib/shiprocket.ts";

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
    const { orderId, shiprocketOrderId, channelOrderId, awb } = await req.json().catch(() => ({}));

    if (!orderId && !shiprocketOrderId && !channelOrderId) {
      return new Response(
        JSON.stringify({ error: "At least one of orderId, shiprocketOrderId, or channelOrderId is required" }),
        { status: 400, headers: { ...cors, "Content-Type": "application/json" } }
      );
    }

    let order: any = null;
    if (orderId) {
      const { data } = await supabaseAdmin.from("orders").select("*").eq("id", orderId).maybeSingle();
      order = data;
    }

    // Branch 1: Legacy Delhivery
    if (order && order.courier === "Delhivery") {
      const delhiveryAwb = order.awb || awb;
      if (!delhiveryAwb) {
        return new Response(JSON.stringify({ error: "No AWB found for legacy order" }), {
          status: 400,
          headers: { ...cors, "Content-Type": "application/json" },
        });
      }
      const delhiveryRes = await cancelDelhivery(delhiveryAwb);
      await supabaseAdmin
        .from("orders")
        .update({
          shipment_cancelled_at: new Date().toISOString(),
          shipment_status: "Cancelled",
        })
        .eq("id", orderId);

      return new Response(
        JSON.stringify({ ok: true, message: "Legacy shipment cancelled", details: delhiveryRes }),
        { status: 200, headers: { ...cors, "Content-Type": "application/json" } }
      );
    }

    // Branch 2: Shiprocket
    const token = await getToken(supabaseAdmin);
    let targetSrOrderId = shiprocketOrderId || (order ? order.shiprocket_order_id : null);
    let targetChannelOrderId = channelOrderId || (order ? order.id.replace(/-/g, "").substring(0, 30) : null);
    const targetAwb = awb || (order ? (order.shiprocket_awb || order.awb) : null);

    // If we don't have the internal numeric Shiprocket Order ID, try searching Shiprocket by channelOrderId
    if (!targetSrOrderId && targetChannelOrderId) {
      try {
        const searchRes = await searchOrders(token, targetChannelOrderId);
        const list = Array.isArray(searchRes?.data) ? searchRes.data : [];
        const match = list.find(
          (o: any) =>
            String(o.channel_order_id).toLowerCase() === String(targetChannelOrderId).toLowerCase() ||
            String(o.id) === String(targetChannelOrderId)
        ) || list[0];

        if (match && match.id) {
          targetSrOrderId = match.id;
        }
      } catch (searchErr) {
        console.error("Error searching order in Shiprocket:", searchErr);
      }
    }

    let cancelRes: any = null;
    let cancelled = false;

    if (targetSrOrderId) {
      cancelRes = await cancelShiprocket(token, [targetSrOrderId]);
      cancelled = true;
    } else if (targetChannelOrderId) {
      // Direct attempt with channel order id if available
      try {
        cancelRes = await cancelShiprocket(token, [targetChannelOrderId]);
        cancelled = true;
      } catch (err: any) {
        console.error("Direct cancel attempt failed:", err.message);
      }
    }

    // Also cancel AWB if an AWB was assigned
    if (targetAwb) {
      try {
        await cancelShipmentAwb(token, [targetAwb]);
      } catch (awbErr) {
        console.warn("AWB cancel notice:", awbErr);
      }
    }

    // Update order in database if it exists
    if (orderId && order) {
      await supabaseAdmin
        .from("orders")
        .update({
          shiprocket_cancelled_at: new Date().toISOString(),
          shipment_status: "Cancelled",
        })
        .eq("id", orderId);
    }

    if (!cancelled) {
      return new Response(
        JSON.stringify({
          error: "Could not identify Shiprocket order to cancel",
          searched: { targetSrOrderId, targetChannelOrderId },
        }),
        { status: 404, headers: { ...cors, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        ok: true,
        message: "Shiprocket shipment cancelled successfully",
        cancelledSrOrderId: targetSrOrderId,
        details: cancelRes,
      }),
      { status: 200, headers: { ...cors, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("Error in shiprocket-cancel:", err);
    return new Response(
      JSON.stringify({ error: "Internal error", details: err.message }),
      { status: 500, headers: { ...cors, "Content-Type": "application/json" } }
    );
  }
});
