// supabase/functions/lib/shiprocket.ts

export const SHIPROCKET_BASE = 'https://apiv2.shiprocket.in/v1/external';

export async function getToken(supabaseAdmin: any): Promise<string> {
  const email = Deno.env.get("SHIPROCKET_EMAIL");
  const password = Deno.env.get("SHIPROCKET_PASSWORD");
  
  if (!email || !password) {
    throw new Error("SHIPROCKET_EMAIL or SHIPROCKET_PASSWORD missing");
  }

  // Check cache
  const { data: cached } = await supabaseAdmin
    .from("app_secrets")
    .select("*")
    .eq("key", "shiprocket_token")
    .single();

  if (cached && cached.expires_at) {
    const expiresAt = new Date(cached.expires_at).getTime();
    if (expiresAt > Date.now() + 30 * 60 * 1000) {
      return cached.value;
    }
  }

  // Fetch new
  const res = await fetch(`${SHIPROCKET_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  const body = await res.json();
  if (!res.ok || !body.token) {
    throw new Error(`Shiprocket auth failed: ${JSON.stringify(body)}`);
  }

  const token = body.token;
  const expiresAt = new Date(Date.now() + 23 * 60 * 60 * 1000).toISOString();

  await supabaseAdmin
    .from("app_secrets")
    .upsert({
      key: "shiprocket_token",
      value: token,
      expires_at: expiresAt,
      updated_at: new Date().toISOString()
    });

  return token;
}

export async function createOrder(token: string, payload: any): Promise<any> {
  const res = await fetch(`${SHIPROCKET_BASE}/orders/create/adhoc`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  
  const body = await res.json();
  if (!res.ok) {
     throw new Error(`Shiprocket createOrder failed: ${JSON.stringify(body)}`);
  }
  return body;
}

export async function assignAWB(token: string, shipmentId: string): Promise<any> {
  const res = await fetch(`${SHIPROCKET_BASE}/courier/assign/awb`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ shipment_id: shipmentId }),
  });
  
  const body = await res.json();
  // Sometimes shiprocket returns 200 but ok is 0 or status is 0, handled by caller
  if (!res.ok) {
     throw new Error(`Shiprocket assign AWB failed: ${JSON.stringify(body)}`);
  }
  return body;
}

export async function generateLabel(token: string, shipmentId: string): Promise<any> {
  const res = await fetch(`${SHIPROCKET_BASE}/courier/generate/label`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ shipment_id: [shipmentId] }),
  });
  
  const body = await res.json();
  if (!res.ok) {
     throw new Error(`Shiprocket generate label failed: ${JSON.stringify(body)}`);
  }
  return body;
}

export async function cancelOrder(token: string, ids: string[]): Promise<any> {
  const res = await fetch(`${SHIPROCKET_BASE}/orders/cancel`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ ids }),
  });
  
  const body = await res.json();
  if (!res.ok) {
     throw new Error(`Shiprocket cancel failed: ${JSON.stringify(body)}`);
  }
  return body;
}
