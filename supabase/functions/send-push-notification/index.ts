import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.93.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Web Push utility functions
function base64UrlToUint8Array(base64Url: string): Uint8Array {
  const padding = "=".repeat((4 - (base64Url.length % 4)) % 4);
  const base64 = (base64Url + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const array = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    array[i] = rawData.charCodeAt(i);
  }
  return array;
}

async function importVapidKeys(publicKey: string, privateKey: string) {
  const publicKeyData = base64UrlToUint8Array(publicKey);
  const privateKeyData = base64UrlToUint8Array(privateKey);
  
  // Import the private key for signing
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    privateKeyData,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );
  
  return { publicKeyData, cryptoKey };
}

function encodeBase64Url(data: Uint8Array): string {
  return btoa(String.fromCharCode(...data))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function createJWT(audience: string, subject: string, cryptoKey: CryptoKey): Promise<string> {
  const header = { typ: "JWT", alg: "ES256" };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    aud: audience,
    exp: now + 12 * 3600,
    sub: subject,
  };
  
  const encoder = new TextEncoder();
  const headerB64 = encodeBase64Url(encoder.encode(JSON.stringify(header)));
  const payloadB64 = encodeBase64Url(encoder.encode(JSON.stringify(payload)));
  const unsignedToken = `${headerB64}.${payloadB64}`;

  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    cryptoKey,
    encoder.encode(unsignedToken)
  );

  // Convert DER signature to raw format (64 bytes: r + s)
  const sigArray = new Uint8Array(signature);
  const signatureB64 = encodeBase64Url(sigArray);
  
  return `${unsignedToken}.${signatureB64}`;
}

async function sendWebPush(
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
  payload: string,
  vapidPublicKey: string,
  vapidCryptoKey: CryptoKey,
  vapidSubject: string
): Promise<boolean> {
  try {
    const url = new URL(subscription.endpoint);
    const audience = `${url.protocol}//${url.host}`;
    
    const jwt = await createJWT(audience, vapidSubject, vapidCryptoKey);
    
    const response = await fetch(subscription.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "TTL": "86400",
        "Authorization": `vapid t=${jwt}, k=${vapidPublicKey}`,
      },
      body: payload,
    });

    if (response.status === 201 || response.status === 200) {
      return true;
    }
    
    console.error(`Push failed: ${response.status} ${await response.text()}`);
    return false;
  } catch (err) {
    console.error("sendWebPush error:", err);
    return false;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY");
    const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY");
    
    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
      throw new Error("VAPID keys not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { user_ids, title, body, url, tag } = await req.json();

    if (!user_ids || !Array.isArray(user_ids) || user_ids.length === 0) {
      throw new Error("Missing user_ids array");
    }

    // Get all subscriptions for these users
    const { data: subscriptions, error: subError } = await supabase
      .from("push_subscriptions")
      .select("*")
      .in("user_id", user_ids);

    if (subError) throw subError;
    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ sent: 0, message: "No subscriptions found" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const payload = JSON.stringify({ title, body, url, tag });
    const { cryptoKey } = await importVapidKeys(VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
    const vapidSubject = "mailto:noreply@lovable.app";

    let sent = 0;
    let failed = 0;
    const expiredIds: string[] = [];

    for (const sub of subscriptions) {
      if (sub.platform === "web") {
        const webSub = sub.subscription as { endpoint: string; keys: { p256dh: string; auth: string } };
        const ok = await sendWebPush(webSub, payload, VAPID_PUBLIC_KEY, cryptoKey, vapidSubject);
        if (ok) {
          sent++;
        } else {
          failed++;
          expiredIds.push(sub.id);
        }
      }
      // TODO: Handle mobile (FCM/APNs) push here in the future
    }

    // Clean up expired/invalid subscriptions
    if (expiredIds.length > 0) {
      await supabase
        .from("push_subscriptions")
        .delete()
        .in("id", expiredIds);
    }

    console.log(`Push sent: ${sent}, failed: ${failed}, cleaned: ${expiredIds.length}`);

    return new Response(
      JSON.stringify({ sent, failed, total: subscriptions.length }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error in send-push-notification:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
