export interface Env {
  GOOGLE_CLIENT_EMAIL: string;
  GOOGLE_PRIVATE_KEY: string;
}

const PACKAGE_NAME = "com.MenuSemanal.app";
const PRODUCT_ID = "nevu_plus";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*", // O pon la URL de tu web de producción
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }
    if (request.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });
    }

    try {
      const { purchaseToken } = (await request.json()) as { purchaseToken?: string };
      if (!purchaseToken || typeof purchaseToken !== "string") {
        return Response.json({ valid: false, error: "Falta purchaseToken" }, { status: 400, headers: corsHeaders });
      }

      const accessToken = await getGoogleAccessToken(env.GOOGLE_CLIENT_EMAIL, env.GOOGLE_PRIVATE_KEY);

      const url = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${PACKAGE_NAME}/purchases/products/${PRODUCT_ID}/tokens/${encodeURIComponent(purchaseToken)}`;
      const googleRes = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!googleRes.ok) {
        return Response.json({ valid: false, error: "Recibo no encontrado en Google Play" }, { headers: corsHeaders });
      }

      const data: any = await googleRes.json();
      const isValid = data.purchaseState === 0; // 0 = Comprado con éxito

      return Response.json({ valid: isValid }, { headers: corsHeaders });
    } catch (e: any) {
      return Response.json({ valid: false, error: e?.message || "Error interno" }, { status: 500, headers: corsHeaders });
    }
  },
};

async function getGoogleAccessToken(clientEmail: string, privateKeyPem: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: clientEmail,
    scope: "https://www.googleapis.com/auth/androidpublisher",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };

  const toBase64Url = (obj: object) =>
    btoa(JSON.stringify(obj)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

  const unsignedToken = `${toBase64Url(header)}.${toBase64Url(payload)}`;

  const pemContents = privateKeyPem
    .replace(/\\n/g, "\n")
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s+/g, "");

  const binaryDer = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    binaryDer.buffer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signatureBuffer = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    new TextEncoder().encode(unsignedToken)
  );

  const signatureBase64Url = btoa(String.fromCharCode(...new Uint8Array(signatureBuffer)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  const jwt = `${unsignedToken}.${signatureBase64Url}`;

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  const tokenData: any = await tokenRes.json();
  if (!tokenData.access_token) {
    throw new Error("No se pudo autenticar la Service Account con Google");
  }
  return tokenData.access_token;
}