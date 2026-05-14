import crypto from 'crypto';

const SHOPIFY_API_KEY = process.env.SHOPIFY_API_KEY!;
const SHOPIFY_API_SECRET = process.env.SHOPIFY_API_SECRET!;
const APP_URL = process.env.APP_URL!;

export function getAuthUrl(shop: string, nonce: string): string {
  const params = new URLSearchParams({
    client_id: SHOPIFY_API_KEY,
    scope: 'read_orders,write_fulfillments',
    redirect_uri: `${APP_URL}/api/auth/callback`,
    state: nonce,
  });
  return `https://${shop}/admin/oauth/authorize?${params.toString()}`;
}

export async function exchangeCodeForToken(
  shop: string,
  code: string
): Promise<string> {
  const response = await fetch(
    `https://${shop}/admin/oauth/access_token`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: SHOPIFY_API_KEY,
        client_secret: SHOPIFY_API_SECRET,
        code,
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to exchange code: ${response.statusText}`);
  }

  const data = await response.json();
  return data.access_token;
}

export async function registerWebhook(
  shop: string,
  accessToken: string
): Promise<void> {
  const response = await fetch(
    `https://${shop}/admin/api/2024-01/webhooks.json`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': accessToken,
      },
      body: JSON.stringify({
        webhook: {
          topic: 'orders/paid',
          address: `${APP_URL}/api/webhooks/orders-paid`,
          format: 'json',
        },
      }),
    }
  );

  if (!response.ok) {
    const text = await response.text();
    console.error('Failed to register webhook:', text);
  }
}

export function verifyHmac(
  data: string,
  hmacHeader: string
): boolean {
  const computed = crypto
    .createHmac('sha256', SHOPIFY_API_SECRET)
    .update(data, 'utf8')
    .digest('base64');
  return crypto.timingSafeEqual(
    Buffer.from(computed),
    Buffer.from(hmacHeader)
  );
}

export function verifyCallbackHmac(query: Record<string, string>): boolean {
  const { hmac, ...rest } = query;
  if (!hmac) return false;

  const message = Object.keys(rest)
    .sort()
    .map((key) => `${key}=${rest[key]}`)
    .join('&');

  const computed = crypto
    .createHmac('sha256', SHOPIFY_API_SECRET)
    .update(message)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(computed),
    Buffer.from(hmac)
  );
}

export function generateNonce(): string {
  return crypto.randomBytes(16).toString('hex');
}
