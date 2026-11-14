export interface Env {
  WEBHOOK_HMAC_SECRET: string;
  FIREBASE_PROJECT_ID: string;
  FCM_SERVICE_ACCOUNT: string; // JSON string containing { client_email, private_key }
}

function hexToBuf(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

/**
 * Generates Google OAuth2 Access Token for FCM HTTP v1 API
 */
async function getGoogleOAuth2Token(serviceAccountJson: string): Promise<string> {
  const sa = JSON.parse(serviceAccountJson);
  const now = Math.floor(Date.now() / 1000);

  const header = { alg: 'RS256', typ: 'JWT' };
  const claim = {
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  };

  const encodeBase64Url = (obj: any) =>
    btoa(JSON.stringify(obj))
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');

  const unsignedToken = `${encodeBase64Url(header)}.${encodeBase64Url(claim)}`;

  // Convert PEM private key to CryptoKey
  const pem = sa.private_key
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s+/g, '');

  const binaryDer = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0));

  const key = await crypto.subtle.importKey(
    'pkcs8',
    binaryDer.buffer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    new TextEncoder().encode(unsignedToken)
  );

  const signedJwt = `${unsignedToken}.${btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')}`;

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${signedJwt}`,
  });

  const tokenData = (await tokenRes.json()) as any;
  return tokenData.access_token;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405 });
    }

    // 1. Verify HMAC Signature and timestamp freshness
    const timestamp = request.headers.get('X-Webhook-Timestamp') || '';
    const signature = request.headers.get('X-Webhook-Signature') || '';
    const now = Date.now();

    if (!timestamp || !signature) {
      return new Response(JSON.stringify({ error: 'Missing webhook headers' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Timestamp drift validation: reject requests older or newer than 30 seconds
    if (Math.abs(now - Number(timestamp)) > 30000) {
      return new Response(JSON.stringify({ error: 'Webhook timestamp expired or drifted >30s' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const bodyText = await request.text();
    const encoder = new TextEncoder();

    if (!env.WEBHOOK_HMAC_SECRET) {
      return new Response(JSON.stringify({ error: 'Worker unconfigured: WEBHOOK_HMAC_SECRET missing' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(env.WEBHOOK_HMAC_SECRET),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    const verified = await crypto.subtle.verify(
      'HMAC',
      key,
      hexToBuf(signature),
      encoder.encode(`${timestamp}.${bodyText}`)
    );

    if (!verified) {
      return new Response(JSON.stringify({ error: 'Invalid HMAC signature' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const payload = JSON.parse(bodyText);

    // 2. Enforce 4KB FCM payload limit & safe auto-truncation
    let fcmData: Record<string, string> = { ...payload.data };
    let serializedBytes = encoder.encode(JSON.stringify(fcmData)).length;
    let isTruncated = false;

    if (serializedBytes > 3584) {
      // Exceeds 3.5KB safety threshold: truncate details to essential IDs and flags
      isTruncated = true;
      fcmData = {
        entity: String(payload.entity),
        entity_id: String(payload.entity_id),
        summary: String(payload.summary || 'Update available'),
        truncated: 'true',
        version: String(payload.version || 1),
        updated_at: String(payload.updated_at || now),
      };
    }

    // 3. Dispatch to FCM HTTP v1 API
    if (!env.FCM_SERVICE_ACCOUNT || !env.FIREBASE_PROJECT_ID) {
      // Service account not provided in worker environment: return simulated success for testing
      return new Response(
        JSON.stringify({
          success: true,
          fcmStatus: 200,
          delivered: false,
          truncated: isTruncated,
          note: 'Webhook verified. FCM credentials awaiting deployment configuration in Cloudflare secrets.',
        }),
        { headers: { 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    try {
      const accessToken = await getGoogleOAuth2Token(env.FCM_SERVICE_ACCOUNT);
      const fcmResponse = await fetch(
        `https://fcm.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/messages:send`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: {
              topic: payload.recipientTopic || `user_${payload.recipientId}`,
              data: fcmData,
            },
          }),
        }
      );

      return new Response(
        JSON.stringify({
          success: fcmResponse.ok,
          fcmStatus: fcmResponse.status,
          truncated: isTruncated,
        }),
        { headers: { 'Content-Type': 'application/json' }, status: fcmResponse.status }
      );
    } catch (err: any) {
      return new Response(
        JSON.stringify({
          success: false,
          error: err?.message || 'FCM dispatch failure',
        }),
        { headers: { 'Content-Type': 'application/json' }, status: 502 }
      );
    }
  },
};
