// supabase/functions/delhivery-cancel/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { cancelShipment } from "../lib/delhivery.ts";

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  global: { headers: { 'x-verify-admin': 'true' } },
});

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { awb, orderId } = body;

    if (!awb && !orderId) {
      return new Response(JSON.stringify({ error: 'awb or orderId required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    let resolvedAwb = awb;
    if (!resolvedAwb && orderId) {
      const { data: order } = await supabaseAdmin.from('orders').select('awb').eq('id', orderId).single();
      resolvedAwb = (order as any)?.awb;
    }

    if (!resolvedAwb) {
      return new Response(JSON.stringify({ error: 'AWB not found for provided orderId' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    const delhiveryRes = await cancelShipment(resolvedAwb);

    const updatePayload: any = {
      delhivery_response: delhiveryRes.body || delhiveryRes,
    };

    if (delhiveryRes.ok) {
      updatePayload.shipment_status = 'cancelled';
      updatePayload.shipment_cancelled_at = new Date().toISOString();
    }

    const { error: upErr } = await supabaseAdmin.from('orders').update(updatePayload).eq('awb', resolvedAwb);
    if (upErr) {
      return new Response(JSON.stringify({ error: 'Failed to update order after cancel', details: upErr }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    return new Response(JSON.stringify({ ok: true, delhiveryRes }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: 'Internal error', message: err?.message || String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }
});