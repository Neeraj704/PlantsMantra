// supabase/functions/delhivery-get-label/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { fetchLabel } from "../lib/delhivery.ts";

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  global: { headers: { 'x-verify-admin': 'true' } },
});

function arrayBufferToBase64(buffer: ArrayBuffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunkSize)));
  }
  return btoa(binary);
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  try {
    const url = new URL(req.url);
    const awbQuery = url.searchParams.get('awb');

    let awb = awbQuery;
    if (!awb) {
      const body = await req.json().catch(() => ({}));
      awb = body?.awb;
    }

    if (!awb) {
      return new Response(JSON.stringify({ error: 'awb parameter required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    // Try to fetch via Delhivery util
    const labelRes = await fetchLabel(awb);

    if (!labelRes.ok) {
      // Try stored label_url in DB
      const { data: order } = await supabaseAdmin.from('orders').select('label_url').eq('awb', awb).single();
      const labelUrl = (order as any)?.label_url;
      if (labelUrl) {
        const pdf = await fetch(labelUrl);
        if (pdf.ok) {
          const arr = await pdf.arrayBuffer();
          return new Response(arr, {
            status: 200,
            headers: {
              'Content-Type': pdf.headers.get('content-type') || 'application/pdf',
              'Content-Disposition': `attachment; filename="label_${awb}.pdf"`,
              'Access-Control-Allow-Origin': '*',
            },
          });
        }
      }

      return new Response(JSON.stringify({ error: 'Label not found', details: labelRes }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    const buffer = labelRes.buffer as ArrayBuffer;
    const contentType = labelRes.contentType || 'application/pdf';

    // Optionally save label base64 into delhivery_response (non-ideal for production).
    try {
      const base64 = arrayBufferToBase64(buffer);
      const { data: order } = await supabaseAdmin.from('orders').select('id, delhivery_response').eq('awb', awb).single();
      if (order) {
        const existing = (order as any)?.delhivery_response || {};
        const merged = { ...existing, label_base64: base64 };
        await supabaseAdmin.from('orders').update({ delhivery_response: merged }).eq('awb', awb);
      }
    } catch (_e) {
      // ignore failures to persist
    }

    // Return binary PDF
    const uint8 = new Uint8Array(buffer);
    return new Response(uint8, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="label_${awb}.pdf"`,
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: 'Internal error', message: err?.message || String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }
});