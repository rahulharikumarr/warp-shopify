import { sql } from '@vercel/postgres';

export async function initDb() {
  await sql`
    CREATE TABLE IF NOT EXISTS shopify_installs (
      shop TEXT PRIMARY KEY,
      access_token TEXT NOT NULL,
      warp_api_key TEXT,
      slack_webhook TEXT,
      auto_book BOOLEAN DEFAULT true,
      carrier_preference TEXT DEFAULT 'fastest',
      installed_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS shopify_bookings (
      id SERIAL PRIMARY KEY,
      shop TEXT NOT NULL,
      order_id TEXT NOT NULL,
      warp_order_id TEXT,
      tracking_number TEXT,
      amount NUMERIC,
      status TEXT DEFAULT 'booked',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
}

export interface ShopInstall {
  shop: string;
  access_token: string;
  warp_api_key: string | null;
  slack_webhook: string | null;
  auto_book: boolean;
  carrier_preference: string;
  installed_at: string;
}

export interface ShopBooking {
  id: number;
  shop: string;
  order_id: string;
  warp_order_id: string | null;
  tracking_number: string | null;
  amount: number | null;
  status: string;
  created_at: string;
}

export async function getShopInstall(shop: string): Promise<ShopInstall | null> {
  const result = await sql<ShopInstall>`
    SELECT * FROM shopify_installs WHERE shop = ${shop}
  `;
  return result.rows[0] ?? null;
}

export async function upsertShopInstall(
  shop: string,
  accessToken: string
): Promise<void> {
  await sql`
    INSERT INTO shopify_installs (shop, access_token)
    VALUES (${shop}, ${accessToken})
    ON CONFLICT (shop) DO UPDATE SET access_token = ${accessToken}
  `;
}

export async function updateShopSettings(
  shop: string,
  warpApiKey: string | null,
  slackWebhook: string | null,
  autoBook: boolean,
  carrierPreference: string
): Promise<void> {
  await sql`
    UPDATE shopify_installs
    SET warp_api_key = ${warpApiKey},
        slack_webhook = ${slackWebhook},
        auto_book = ${autoBook},
        carrier_preference = ${carrierPreference}
    WHERE shop = ${shop}
  `;
}

export async function insertBooking(
  shop: string,
  orderId: string,
  warpOrderId: string | null,
  trackingNumber: string | null,
  amount: number | null,
  status: string
): Promise<void> {
  await sql`
    INSERT INTO shopify_bookings (shop, order_id, warp_order_id, tracking_number, amount, status)
    VALUES (${shop}, ${orderId}, ${warpOrderId}, ${trackingNumber}, ${amount}, ${status})
  `;
}

export async function getRecentBookings(shop: string, limit = 10): Promise<ShopBooking[]> {
  const result = await sql<ShopBooking>`
    SELECT * FROM shopify_bookings
    WHERE shop = ${shop}
    ORDER BY created_at DESC
    LIMIT ${limit}
  `;
  return result.rows;
}
