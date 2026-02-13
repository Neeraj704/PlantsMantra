// supabase/functions/lib/delhivery.ts
// Utilities for interacting with Delhivery APIs from Supabase Edge Functions.

const API_BASE =
  Deno.env.get("DELHIVERY_ENV") === "staging"
    ? "https://staging-express.delhivery.com"
    : "https://track.delhivery.com";

const TOKEN = Deno.env.get("DELHIVERY_TOKEN") || "";

function formUrlEncoded(payload) {
  return `format=json&data=${encodeURIComponent(JSON.stringify(payload))}`;
}

export async function createShipment(payload) {
  if (!TOKEN) {
    throw new Error("DELHIVERY_TOKEN not set in environment");
  }

  const pickupLocation = {
    name: Deno.env.get("DELHIVERY_PICKUP_LOCATION") || "DEFAULT_WAREHOUSE",
    add: Deno.env.get("DELHIVERY_PICKUP_ADDRESS") || "",
    country: "India",
    pin: Deno.env.get("DELHIVERY_PICKUP_PIN") || "",
    phone: Deno.env.get("DELHIVERY_PICKUP_PHONE") || "",
    city: Deno.env.get("DELHIVERY_PICKUP_CITY") || "",
    state: Deno.env.get("DELHIVERY_PICKUP_STATE") || "",
  };

  const shipment = {
    country: payload.country || "India",
    city: payload.city,
    seller_add: pickupLocation.add || "",
    cod_amount:
      payload.payment_mode === "COD"
        ? String(payload.cod_amount || 0)
        : "0",
    return_phone: pickupLocation.phone || "",
    seller_inv_date: "",
    seller_name: "",
    pin: payload.pin,
    seller_inv: "",
    state: payload.state,
    return_name: pickupLocation.name || "",
    order: payload.order_id,
    add: `${payload.address_line1}${
      payload.address_line2 ? ", " + payload.address_line2 : ""
    }`,
    payment_mode: payload.payment_mode,
    quantity: String(
      payload.items?.reduce((s, it) => s + (it.qty || 1), 0) || 1
    ),
    name: payload.customer_name,
    phone: payload.customer_phone,
    sku: payload.items?.map((i) => i.name).join(", ") || "ITEM",
    actual_weight: "0.5",
  };

  const createPayload = {
    pickup_location: pickupLocation,
    shipments: [shipment],
  };

  const body = formUrlEncoded(createPayload);

  const res = await fetch(`${API_BASE}/api/cmu/create.json`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",

      // ⭐ FIXED — MUST BE UPPERCASE ⭐
      Authorization: `Token ${TOKEN}`,
    },
    body,
  });

  const text = await res.text();
  let json;
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

export async function cancelShipment(awb) {
  if (!TOKEN) {
    throw new Error("DELHIVERY_TOKEN not set in environment");
  }

  const payload = { waybill: awb, cancellation: "true" };
  const body = formUrlEncoded(payload);

  const endpoints = [
    `${API_BASE}/api/cmu/cancel.json`,
    `${API_BASE}/api/cmu/cancel`,
    `${API_BASE}/api/cmu/cancel_waybill.json`,
  ];

  for (const url of endpoints) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Token ${TOKEN}`, // FIXED
        },
        body,
      });

      const text = await res.text();
      try {
        const json = JSON.parse(text);
        if (res.ok)
          return {
            status: res.status,
            ok: true,
            body: json,
          };
      } catch (e) {
        if (res.ok)
          return {
            status: res.status,
            ok: true,
            body: { raw: text },
          };
      }
    } catch {}
  }

  return {
    status: 500,
    ok: false,
    body: { error: "Failed to cancel via known endpoints" },
  };
}

export async function fetchLabel(awb) {
  if (!TOKEN) {
    throw new Error("DELHIVERY_TOKEN not set in environment");
  }

  // 1) PDF endpoint
  try {
    const payload = { lr_numbers: [awb], label_size: "A4" };
    const body = formUrlEncoded(payload);

    const res = await fetch(`${API_BASE}/api/docket/generate_label_pdf`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Token ${TOKEN}`, // FIXED
      },
      body,
    });

    if (res.ok) {
      const buffer = await res.arrayBuffer();
      return {
        ok: true,
        contentType: res.headers.get("content-type") || "application/pdf",
        buffer,
      };
    } else {
      const text = await res.text();
      console.error("Delhivery PDF Label Error:", res.status, text);
    }
  } catch (e) {
    console.error("Delhivery PDF Label Exception:", e);
  }

  // 2) JSON fallback
  try {
    const jsonRes = await fetch(
      `${API_BASE}/waybill/api/print/json/?token=${encodeURIComponent(
        TOKEN
      )}&waybill=${encodeURIComponent(awb)}`,
      { method: "GET" }
    );

    if (jsonRes.ok) {
      const j = await jsonRes.json().catch(() => null);
      const url =
        j?.data?.url || j?.url || j?.label_url || j?.print_url;

      if (url) {
        const pdf = await fetch(url);
        if (pdf.ok) {
          const buffer = await pdf.arrayBuffer();
          return {
            ok: true,
            contentType:
              pdf.headers.get("content-type") || "application/pdf",
            buffer,
          };
        }
      }
    } else {
       console.error("Delhivery JSON Label Error:", jsonRes.status, await jsonRes.text());
    }
  } catch (e) {
    console.error("Delhivery JSON Label Exception:", e);
  }

  // 3) Packing Slip API (works better for some accounts)
  try {
    const res = await fetch(`${API_BASE}/api/p/packing_slip?wbns=${awb}&pdf=true`, {
      method: "GET",
      headers: {
        Authorization: `Token ${TOKEN}`,
      },
    });

    if (res.ok) {
      const buffer = await res.arrayBuffer();
      // Verify if it's actually a PDF (sometimes they return HTML 404 with status 200)
      const firstBytes = new Uint8Array(buffer.slice(0, 4));
      const isPdf =
        firstBytes[0] === 0x25 && // %
        firstBytes[1] === 0x50 && // P
        firstBytes[2] === 0x44 && // D
        firstBytes[3] === 0x46;   // F

      if (isPdf) {
        return {
          ok: true,
          contentType: "application/pdf",
          buffer,
        };
      } else {
        console.error("Delhivery Packing Slip returned non-PDF content");
      }
    } else {
      console.error("Delhivery Packing Slip Error:", res.status, await res.text());
    }
  } catch (e) {
    console.error("Delhivery Packing Slip Exception:", e);
  }

  return { ok: false, error: "Label not available" };
}
