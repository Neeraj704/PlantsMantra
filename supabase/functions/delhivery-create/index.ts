// supabase/functions/delhivery-create/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createShipment } from "../lib/delhivery.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  global: { headers: { "x-verify-admin": "true" } },
});

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: cors });
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

    // Shipment already exists
    if (order.shipment_created_at) {
      return new Response(
        JSON.stringify({
          message: "Shipment already exists",
          order,
        }),
        {
          status: 200,
          headers: { ...cors, "Content-Type": "application/json" },
        }
      );
    }

    // Payment validation
    const isCOD = order.payment_method?.toLowerCase() === "cod";
    if (!isCOD) {
      const validPaidStates = ["paid", "captured", "succeeded"];
      const paymentStatus = (order.payment_status || "").toLowerCase();

      if (!validPaidStates.includes(paymentStatus)) {
        return new Response(
          JSON.stringify({
            error: "Cannot create shipment for unpaid Prepaid order.",
          }),
          {
            status: 400,
            headers: { ...cors, "Content-Type": "application/json" },
          }
        );
      }
    }

    // Validate address
    const shipping = order.shipping_address;
    if (
      !shipping?.postal_code ||
      !shipping?.city ||
      !shipping?.state ||
      !order.customer_name ||
      !order.customer_phone
    ) {
      await supabaseAdmin
        .from("orders")
        .update({ delhivery_response: { error: "Invalid address" } })
        .eq("id", orderId);

      return new Response(JSON.stringify({ error: "Invalid shipping address" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // Fetch order items
    const itemsRaw =
      (await supabaseAdmin
        .from("order_items")
        .select("*")
        .eq("order_id", orderId)).data || [];

    const items = itemsRaw.map((i: any) => ({
      name: i.product_name,
      qty: i.quantity,
      price: i.unit_price ?? undefined,
    }));

    // Build shipment payload
    const shipmentPayload = {
      order_id: order.id,
      customer_name: order.customer_name,
      customer_phone: order.customer_phone,
      address_line1: shipping.address_line1 || "",
      address_line2: shipping.address_line2 || "",
      city: shipping.city,
      state: shipping.state,
      pin: String(shipping.postal_code),
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
    let awb =
      delhiveryRes?.body?.data?.shipments?.[0]?.waybill ||
      delhiveryRes?.body?.response?.waybill ||
      delhiveryRes?.body?.result?.waybill ||
      delhiveryRes?.body?.data?.lrn ||
      null;

    // Update DB
    const updateData: any = {
      courier: "Delhivery",
      delhivery_response: delhiveryRes.body,
      shipment_created_at: new Date().toISOString(),
      shipment_status: "Pending",
    };
    if (awb) updateData.awb = awb;

    const { error: updateErr } = await supabaseAdmin
      .from("orders")
      .update(updateData)
      .eq("id", orderId);

    if (updateErr) {
      return new Response(
        JSON.stringify({
          error: "Shipment created but DB update failed",
          details: updateErr,
        }),
        {
          status: 500,
          headers: { ...cors, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(JSON.stringify({ ok: true, awb, delhiveryRes }), {
      status: 200,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: "Internal error", message: err.message }),
      {
        status: 500,
        headers: { ...cors, "Content-Type": "application/json" },
      }
    );
  }
});
