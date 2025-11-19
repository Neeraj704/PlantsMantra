// supabase/functions/lib/delhivery.ts
// Utilities for interacting with Delhivery APIs from Supabase Edge Functions.

export type ShipmentPayload = {
  order_id: string;
  customer_name: string;
  customer_phone: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  state: string;
  pin: string;
  country?: string;
  items?: { name: string; qty: number; price?: number }[];
  payment_mode: 'Prepaid' | 'COD';
  cod_amount?: number;
};

const API_BASE =
  Deno.env.get('DELHIVERY_ENV') === 'staging'
    ? 'https://staging-express.delhivery.com'
    : 'https://track.delhivery.com';

const TOKEN = Deno.env.get('DELHIVERY_TOKEN') || '';

function formUrlEncoded(payload: object) {
  return `format=json&data=${encodeURIComponent(JSON.stringify(payload))}`;
}

export async function createShipment(payload: ShipmentPayload) {
  if (!TOKEN) {
    throw new Error('DELHIVERY_TOKEN not set in environment');
  }

  const pickupLocation = {
    name: Deno.env.get('DELHIVERY_PICKUP_LOCATION') || 'DEFAULT_WAREHOUSE',
    add: Deno.env.get('DELHIVERY_PICKUP_ADDRESS') || '',
    country: 'India',
    pin: Deno.env.get('DELHIVERY_PICKUP_PIN') || '',
    phone: Deno.env.get('DELHIVERY_PICKUP_PHONE') || '',
    city: Deno.env.get('DELHIVERY_PICKUP_CITY') || '',
    state: Deno.env.get('DELHIVERY_PICKUP_STATE') || '',
  };

  const shipment = {
    country: payload.country || 'India',
    city: payload.city,
    seller_add: pickupLocation.add || '',
    cod_amount: payload.payment_mode === 'COD' ? String(payload.cod_amount || 0) : '0',
    return_phone: pickupLocation.phone || '',
    seller_inv_date: '',
    seller_name: '',
    pin: payload.pin,
    seller_inv: '',
    state: payload.state,
    return_name: pickupLocation.name || '',
    order: payload.order_id,
    add: `${payload.address_line1}${payload.address_line2 ? ', ' + payload.address_line2 : ''}`,
    payment_mode: payload.payment_mode,
    quantity: String(payload.items?.reduce((s, it) => s + (it.qty || 1), 0) || 1),
    name: payload.customer_name,
    phone: payload.customer_phone,
    sku: payload.items?.map((i) => i.name).join(', ') || 'ITEM',
    actual_weight: '0.5',
  };

  const createPayload = {
    pickup_location: pickupLocation,
    shipments: [shipment],
  };

  const body = formUrlEncoded(createPayload);

  const res = await fetch(`${API_BASE}/api/cmu/create.json`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `token ${TOKEN}`,
    },
    body,
  });

  const text = await res.text();
  let json: any;
  try {
    json = JSON.parse(text);
  } catch (e) {
    json = { raw: text };
  }

  return {
    status: res.status,
    ok: res.ok,
    body: json,
  };
}

export async function cancelShipment(awb: string) {
  if (!TOKEN) {
    throw new Error('DELHIVERY_TOKEN not set in environment');
  }

  const payload = {
    waybill: awb,
    cancellation: 'true',
  };

  const body = formUrlEncoded(payload);

  const endpoints = [
    `${API_BASE}/api/cmu/cancel.json`,
    `${API_BASE}/api/cmu/cancel`,
    `${API_BASE}/api/cmu/cancel_waybill.json`,
  ];

  for (const url of endpoints) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `token ${TOKEN}`,
        },
        body,
      });
      const text = await res.text();
      try {
        const json = JSON.parse(text);
        if (res.ok) return { status: res.status, ok: true, body: json };
      } catch (e) {
        if (res.ok) return { status: res.status, ok: true, body: { raw: text } };
      }
    } catch (_e) {
      // try next endpoint
    }
  }

  return { status: 500, ok: false, body: { error: 'Failed to cancel via known endpoints' } };
}

export async function fetchLabel(awb: string) {
  if (!TOKEN) {
    throw new Error('DELHIVERY_TOKEN not set in environment');
  }

  // 1) Try docket/generate_label_pdf
  try {
    const payload = { lr_numbers: [awb], label_size: 'A4' };
    const body = formUrlEncoded(payload);
    const res = await fetch(`${API_BASE}/api/docket/generate_label_pdf`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `token ${TOKEN}`,
      },
      body,
    });

    if (res.ok) {
      const buffer = await res.arrayBuffer();
      return { ok: true, contentType: res.headers.get('content-type') || 'application/pdf', buffer };
    }
  } catch (e) {
    // continue
  }

  // 2) Try JSON endpoint that may include a download URL
  try {
    const jsonRes = await fetch(
      `${API_BASE}/waybill/api/print/json/?token=${encodeURIComponent(TOKEN)}&waybill=${encodeURIComponent(awb)}`,
      { method: 'GET' }
    );
    if (jsonRes.ok) {
      const j = await jsonRes.json().catch(() => null);
      const possibleUrl = j?.data?.url || j?.url || j?.label_url || j?.print_url;
      if (possibleUrl) {
        const pdf = await fetch(possibleUrl);
        if (pdf.ok) {
          const buffer = await pdf.arrayBuffer();
          return { ok: true, contentType: pdf.headers.get('content-type') || 'application/pdf', buffer };
        }
      }
    }
  } catch (_e) {
    // ignore
  }

  // 3) fallback bulk endpoint
  try {
    const jsonRes = await fetch(`${API_BASE}/waybill/api/bulk/json/?token=${encodeURIComponent(TOKEN)}&count=1`);
    if (jsonRes.ok) {
      return { ok: true, contentType: 'application/json', buffer: await jsonRes.arrayBuffer() };
    }
  } catch (_e) {
    // ignore
  }

  return { ok: false, error: 'Label not available via attempted Delhivery endpoints' };
}