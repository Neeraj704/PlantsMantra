import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getToken, createOrder, updateOrder, assignAWB, generateLabel, getOrder } from "../lib/shiprocket.ts";

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
    const { orderId, weight, length, breadth, height, action = 'create_draft' } = await req.json().catch(() => ({}));
    if (!orderId) {
      return new Response(JSON.stringify({ error: "orderId required" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
    }

    const { data: order, error: orderErr } = await supabaseAdmin.from("orders").select("*").eq("id", orderId).single();
    if (orderErr || !order) {
      return new Response(JSON.stringify({ error: "Order not found" }), { status: 404, headers: { ...cors, "Content-Type": "application/json" } });
    }

    const token = await getToken(supabaseAdmin);

    // ACTION: RESET SHIPMENT (Cleanly cancels on Shiprocket and resets DB columns with service role privileges)
    if (action === 'reset_shipment') {
      if (order.shiprocket_order_id) {
        try {
          await cancelOrder(token, [order.shiprocket_order_id]);
        } catch (cErr) {
          console.warn("Cancel in reset_shipment notice:", cErr);
        }
      }
      await supabaseAdmin.from("orders").update({
        awb: null,
        courier: null,
        shipment_created_at: null,
        shiprocket_order_id: null,
        shiprocket_shipment_id: null,
        shiprocket_awb: null,
        shiprocket_label_url: null,
        shiprocket_tracking_url: null,
        shiprocket_response: null,
        delhivery_response: null,
        shipment_status: "Pending"
      }).eq("id", orderId);

      return new Response(JSON.stringify({ ok: true, message: "Shipment reset successfully" }), {
        status: 200,
        headers: { ...cors, "Content-Type": "application/json" }
      });
    }

    // ACTION: SYNC AWB & COURIER FROM SHIPROCKET (After seller clicks 'Ship Now' in Shiprocket)
    if (action === 'sync_awb') {
      const srOrderId = order.shiprocket_order_id;
      if (!srOrderId) {
        return new Response(JSON.stringify({ error: "Order has not been pushed to Shiprocket yet" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
      }

      const srDetails = await getOrder(token, srOrderId);
      const srData = srDetails.data || srDetails;
      const shipment = Array.isArray(srData.shipments) ? srData.shipments[0] : (srData.shipments || {});
      const awb = shipment.awb || srData.awb_code || shipment.awb_code || null;
      const courierName = shipment.courier || srData.courier_name || shipment.courier_name || null;
      const status = srData.status || order.shipment_status || "Pending";

      const updates: any = {
        shipment_status: status,
      };

      if (awb) {
        updates.awb = awb;
        updates.shiprocket_awb = awb;
        updates.shiprocket_tracking_url = `https://shiprocket.co/tracking/${awb}`;
      }
      if (courierName) {
        updates.courier = courierName;
        updates.shiprocket_courier_name = courierName;
      }

      await supabaseAdmin.from("orders").update(updates).eq("id", orderId);

      return new Response(JSON.stringify({
        ok: true,
        synced: Boolean(awb),
        awb,
        courierName,
        status,
        shiprocketOrderId: srOrderId,
        srData,
      }), { status: 200, headers: { ...cors, "Content-Type": "application/json" } });
    }

    // Check if already created on Shiprocket
    const isCancelled = order.shipment_status === 'Cancelled' || order.shipment_status === 'CANCELED';
    const isUpdateAction = action === 'update_pricing' || action === 'recreate_draft' || isCancelled;
    if (order.shiprocket_order_id && !isUpdateAction) {
       return new Response(JSON.stringify({ 
         ok: true, 
         message: "already_pushed", 
         shiprocketOrderId: order.shiprocket_order_id,
         shipmentId: order.shiprocket_shipment_id,
         awb: order.shiprocket_awb || order.awb,
         courierName: order.shiprocket_courier_name,
       }), { status: 200, headers: { ...cors, "Content-Type": "application/json" } });
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
    
    // Distribute order-level discounts proportionally across items so Shiprocket invoice matches website
    const orderGrossSubtotal = Number(order.subtotal) || 1;
    const orderDiscountTotal = Number(order.discount_amount || 0);
    let allocatedDiscount = 0;

    const items = itemsRaw.map((i: any, idx: number) => {
      const lineGross = Number(i.unit_price) * Number(i.quantity);
      let itemDiscount = 0;

      if (orderDiscountTotal > 0) {
        if (idx === itemsRaw.length - 1) {
          // Last item absorbs any rounding remainder
          itemDiscount = Math.round((orderDiscountTotal - allocatedDiscount) * 100) / 100;
        } else {
          itemDiscount = Math.round(((lineGross / orderGrossSubtotal) * orderDiscountTotal) * 100) / 100;
          allocatedDiscount += itemDiscount;
        }
      }

      // Net selling price per unit
      const netPerUnit = Math.round(((lineGross - itemDiscount) / Number(i.quantity)) * 100) / 100;

      return {
        name: i.product_name,
        sku: i.product_id ? String(i.product_id).substring(0, 8) : "ITEM",
        units: Number(i.quantity),
        selling_price: netPerUnit,
        discount: 0,
        tax: 0
      };
    });

    const channelId = Deno.env.get("SHIPROCKET_CHANNEL_ID") || "44726174472617";
    if (!channelId) throw new Error("SHIPROCKET_CHANNEL_ID not set");

    const parsedLength = Number(length) > 0 ? Number(length) : 15;
    const parsedBreadth = Number(breadth) > 0 ? Number(breadth) : 15;
    const parsedHeight = Number(height) > 0 ? Number(height) : 15;
    const parsedWeight = Number(weight) > 0 ? Number(weight) : parseFloat(Deno.env.get("SHIPROCKET_DEFAULT_WEIGHT") || "0.5");

    // sub_total should match net total product value after discounts
    const netBillableTotal = Number(order.total);
    const shippingCost = Number(order.shipping_cost || 0);
    const netItemsSubtotal = Math.max(0, Math.round((netBillableTotal - shippingCost) * 100) / 100);

    // Generate a unique order_id string. If recreations happen, allow suffixing to avoid duplicate key rejection by Shiprocket
    const cleanId = String(order.id).replace(/-/g, '').substring(0, 24);
    const shiprocketOrderRef = (order.shipment_status === 'Pending' || action === 'recreate_draft' || isUpdateAction)
      ? `${cleanId}_${Date.now().toString().slice(-4)}`
      : cleanId;

    const payload = {
      order_id: shiprocketOrderRef,
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
      sub_total: netItemsSubtotal,
      shipping_charges: shippingCost,
      total_discount: 0, // already applied into net item selling_price to guarantee Shiprocket invoice matches
      length: parsedLength,
      breadth: parsedBreadth,
      height: parsedHeight,
      weight: parsedWeight,
      pickup_location: Deno.env.get("SHIPROCKET_PICKUP_LOCATION") || "plantsmn"
    };

    let shiprocketOrderId = order.shiprocket_order_id;
    let shipmentId = order.shiprocket_shipment_id;
    let createRes = null;

    if (order.shiprocket_order_id && isUpdateAction) {
      try {
        const updatePayload = {
          ...payload,
          order_id: order.shiprocket_order_id
        };
        createRes = await updateOrder(token, updatePayload);
      } catch (updateErr) {
        console.warn("Shiprocket updateOrder failed, proceeding to recreate draft:", updateErr);
        // If updating is rejected by Shiprocket, cancel and create fresh
        try {
          await cancelOrder(token, [order.shiprocket_order_id]);
        } catch (_) {}
        createRes = await createOrder(token, payload);
        shiprocketOrderId = String(createRes.order_id);
        shipmentId = String(createRes.shipment_id);
      }
    } else if (!shiprocketOrderId) {
      createRes = await createOrder(token, payload);
      if (!createRes.order_id) {
        return new Response(JSON.stringify({ error: "Shiprocket order creation failed", details: createRes }), { 
          status: 400, 
          headers: { ...cors, "Content-Type": "application/json" } 
        });
      }
      shiprocketOrderId = String(createRes.order_id);
      shipmentId = String(createRes.shipment_id);
    }

    let awb = order.shiprocket_awb || null;
    let courierName = order.shiprocket_courier_name || null;
    let labelUrl = order.shiprocket_label_url || null;
    let trackingUrl = null;

    // ONLY auto-assign if action is explicitly 'auto_assign'
    if (action === 'auto_assign') {
      if (!awb && shipmentId) {
        const assignRes = await assignAWB(token, shipmentId);
        if (assignRes.response && assignRes.response.data) {
          awb = assignRes.response.data.awb_code;
          courierName = assignRes.response.data.courier_name;
        }
      }

      if (awb && shipmentId) {
         trackingUrl = `https://shiprocket.co/tracking/${awb}`;
         try {
           const labelRes = await generateLabel(token, shipmentId);
           if (labelRes.label_created) labelUrl = labelRes.label_url;
         } catch (e) {
           console.error("Label generation failed but awb assigned", e);
         }
      }
    }

    const updates = {
      courier: courierName || "Shiprocket",
      awb: awb || order.awb || null,
      shipment_status: awb ? "Pending" : "Pending Courier Selection",
      shiprocket_order_id: shiprocketOrderId,
      shiprocket_shipment_id: shipmentId,
      shiprocket_channel_id: parseInt(channelId, 10),
      shiprocket_awb: awb,
      shiprocket_courier_name: courierName,
      shiprocket_label_url: labelUrl,
      shiprocket_tracking_url: trackingUrl,
      shiprocket_created_at: new Date().toISOString(),
      shiprocket_response: {
        ...(createRes || order.shiprocket_response || {}),
        package_dimensions: {
          length: parsedLength,
          breadth: parsedBreadth,
          height: parsedHeight,
          weight: parsedWeight,
        }
      },
      shipment_created_at: new Date().toISOString(),
    };

    await supabaseAdmin.from("orders").update(updates).eq("id", orderId);

    return new Response(JSON.stringify({ 
      ok: true, 
      shiprocketOrderId, 
      shipmentId, 
      awb, 
      courierName, 
      labelUrl, 
      trackingUrl, 
      length: parsedLength, 
      breadth: parsedBreadth, 
      height: parsedHeight, 
      weight: parsedWeight,
      status: awb ? "ASSIGNED" : "NEW"
    }), {
        status: 200, headers: { ...cors, "Content-Type": "application/json" }
    });
  } catch (err: any) {
    console.error("error in shiprocket-create", err);
    return new Response(JSON.stringify({ error: "Internal error", details: err.message }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" }
    });
  }
});
