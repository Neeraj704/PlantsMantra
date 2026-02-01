// supabase/functions/delhivery-create/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createShipment } from "../lib/delhivery.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// ⭐ FULL CORS FIX ⭐
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, apikey, x-client-info",
};

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  global: { headers: { "x-verify-admin": "true" } },
});

serve(async (req: Request) => {
  // ⭐ Handle CORS preflight request
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { orderId } = body;

    if (!orderId) {
      return new Response(JSON.stringify({ error: "orderId required" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // Fetch order
    const { data: order, error: orderErr } = await supabaseAdmin
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .single();

    if (orderErr || !order) {
      return new Response(JSON.stringify({ error: "Order not found" }), {
        status: 404,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // Already created
    if (order.shipment_created_at) {
      return new Response(
        JSON.stringify({
          ok: true,
          message: "Shipment already exists",
          order,
        }),
        { status: 200, headers: { ...cors, "Content-Type": "application/json" } }
      );
    }

    const isCOD = order.payment_method?.toLowerCase() === "cod";

    // Prepaid validation
    if (!isCOD) {
      const paid = ["paid", "captured", "succeeded"];
      const payStatus = (order.payment_status || "").toLowerCase();
      if (!paid.includes(payStatus)) {
        return new Response(
          JSON.stringify({
            error: "Cannot create shipment: prepaid order is unpaid",
          }),
          {
            status: 400,
            headers: { ...cors, "Content-Type": "application/json" },
          }
        );
      }
    }


    // Validate address - support both postal_code and pin fields
    const shipping = order.shipping_address;
    const pinCode = shipping?.postal_code || shipping?.pin;
    if (
      !pinCode ||
      !shipping?.city ||
      !shipping?.state ||
      !order.customer_name ||
      !order.customer_phone
    ) {
      await supabaseAdmin
        .from("orders")
        .update({
          delhivery_response: { error: "Invalid shipping address" },
        })
        .eq("id", orderId);

      return new Response(
        JSON.stringify({ error: "Invalid shipping address" }),
        {
          status: 400,
          headers: { ...cors, "Content-Type": "application/json" },
        }
      );
    }

    // Fetch items
    const itemsRaw =
      (
        await supabaseAdmin
          .from("order_items")
          .select("*")
          .eq("order_id", orderId)
      ).data || [];

    const items = itemsRaw.map((i: any) => ({
      name: i.product_name,
      qty: i.quantity,
      price: i.unit_price,
    }));

    // ⭐ Correct Delhivery payload ⭐
    const shipmentPayload = {
      order_id: order.id,
      customer_name: order.customer_name,
      customer_phone: order.customer_phone,
      address_line1: shipping.address_line1 || "",
      address_line2: shipping.address_line2 || "",
      city: shipping.city,
      state: shipping.state,
      pin: String(pinCode),
      items,
      payment_mode: isCOD ? "COD" : "Prepaid",
      cod_amount: isCOD ? Number(order.total || 0) : 0,
    };

    // Call Delhivery API
    const delhiveryRes = await createShipment(shipmentPayload as any);

    if (!delhiveryRes?.ok) {
      await supabaseAdmin
        .from("orders")
        .update({
          delhivery_response: delhiveryRes.body || delhiveryRes,
        })
        .eq("id", orderId);

      return new Response(
        JSON.stringify({
          error: "Failed to create shipment",
          details: delhiveryRes.body,
        }),
        {
          status: 502,
          headers: { ...cors, "Content-Type": "application/json" },
        }
      );
    }

    // Extract AWB
    const awb =
      delhiveryRes?.body?.data?.shipments?.[0]?.waybill ||
      delhiveryRes?.body?.response?.waybill ||
      delhiveryRes?.body?.result?.waybill ||
      delhiveryRes?.body?.data?.lrn ||
      null;

    // Update DB
    const updatePayload: any = {
      courier: "Delhivery",
      delhivery_response: delhiveryRes.body,
      shipment_created_at: new Date().toISOString(),
      shipment_status: "Pending",
    };
    if (awb) updatePayload.awb = awb;

    const { error: updateErr } = await supabaseAdmin
      .from("orders")
      .update(updatePayload)
      .eq("id", orderId);

    if (updateErr) {
      return new Response(
        JSON.stringify({
          error: "Shipment created but could not update DB",
          details: updateErr,
        }),
        {
          status: 500,
          headers: { ...cors, "Content-Type": "application/json" },
        }
      );
    }

    // ⭐ Final success ⭐
    return new Response(
      JSON.stringify({ ok: true, awb, delhiveryRes }),
      {
        status: 200,
        headers: { ...cors, "Content-Type": "application/json" },
      }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({
        error: "Internal error",
        message: err?.message || String(err),
      }),
      {
        status: 500,
        headers: { ...cors, "Content-Type": "application/json" },
      }
    );
  }
});
