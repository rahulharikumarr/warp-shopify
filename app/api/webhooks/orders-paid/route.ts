import { NextRequest, NextResponse } from 'next/server';
import { verifyHmac } from '@/lib/shopify';
import { getShopInstall, insertBooking } from '@/lib/db';
import { quoteWarp, bookWarp, getTomorrowDate } from '@/lib/warp';

interface ShopifyLineItem {
  grams: number;
  quantity: number;
}

interface ShopifyAddress {
  zip: string;
  city: string;
  province: string;
}

interface ShopifyOrder {
  id: number;
  name: string; // e.g. "#1234"
  order_number: number;
  shipping_address: ShopifyAddress;
  line_items: ShopifyLineItem[];
}

async function fulfillShopifyOrder(
  shop: string,
  accessToken: string,
  orderId: number,
  trackingNumber: string
): Promise<void> {
  const trackingUrl = `https://tracking.wearewarp.com/${trackingNumber}`;

  const response = await fetch(
    `https://${shop}/admin/api/2024-01/orders/${orderId}/fulfillments.json`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': accessToken,
      },
      body: JSON.stringify({
        fulfillment: {
          tracking_number: trackingNumber,
          tracking_company: 'Warp',
          tracking_url: trackingUrl,
          notify_customer: true,
        },
      }),
    }
  );

  if (!response.ok) {
    const text = await response.text();
    console.error(`Failed to fulfill Shopify order ${orderId}:`, response.status, text);
  } else {
    console.log(`Shopify order ${orderId} marked fulfilled with tracking ${trackingNumber}`);
  }
}

async function postSlackMessage(webhookUrl: string, payload: object): Promise<void> {
  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.error('Slack notification error:', err);
  }
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const hmacHeader = request.headers.get('X-Shopify-Hmac-Sha256');
  const shopHeader = request.headers.get('X-Shopify-Shop-Domain');

  if (!hmacHeader) {
    return NextResponse.json({ error: 'Missing HMAC header' }, { status: 401 });
  }

  // Verify HMAC
  if (!verifyHmac(rawBody, hmacHeader)) {
    return NextResponse.json({ error: 'Invalid HMAC' }, { status: 401 });
  }

  const shop = shopHeader ?? '';
  if (!shop) {
    return NextResponse.json({ error: 'Missing shop header' }, { status: 400 });
  }

  let order: ShopifyOrder;
  try {
    order = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // Load shop install
  const install = await getShopInstall(shop);
  if (!install) {
    console.error(`Shop not found: ${shop}`);
    return NextResponse.json({ error: 'Shop not installed' }, { status: 404 });
  }

  if (!install.warp_api_key) {
    console.log(`Shop ${shop} has no Warp API key configured`);
    return NextResponse.json({ ok: true, skipped: 'no_warp_key' });
  }

  // Extract order details
  const destinationZip = order.shipping_address?.zip ?? '';
  const weightLbs = order.line_items.reduce((sum, item) => {
    return sum + (item.grams * item.quantity) / 453.592;
  }, 0);
  const pickupDate = getTomorrowDate();

  // Quote Warp
  const quote = await quoteWarp(install.warp_api_key, pickupDate, destinationZip, weightLbs);

  if (!quote) {
    console.error(`Failed to get Warp quote for order ${order.name} shop ${shop}`);
    if (install.slack_webhook) {
      await postSlackMessage(install.slack_webhook, {
        text: `⚠️ Failed to get freight quote for Shopify order ${order.name}`,
      });
    }
    return NextResponse.json({ ok: true, skipped: 'quote_failed' });
  }

  let warpOrderId: string | null = null;
  let trackingNumber: string | null = null;
  let status = 'quoted';

  if (install.auto_book) {
    const booking = await bookWarp(install.warp_api_key, quote.quote_id);
    if (booking) {
      warpOrderId = booking.order_id ?? null;
      trackingNumber = booking.tracking_number ?? null;
      status = 'booked';

      // Mark order as fulfilled in Shopify with Warp tracking info
      if (trackingNumber) {
        await fulfillShopifyOrder(shop, install.access_token, order.id, trackingNumber);
      }
    } else {
      status = 'booking_failed';
    }
  }

  // Save to DB
  await insertBooking(
    shop,
    String(order.id),
    warpOrderId,
    trackingNumber,
    quote.total_amount ?? null,
    status
  );

  // Send Slack notification
  if (install.slack_webhook) {
    const destination = order.shipping_address
      ? `${order.shipping_address.city}, ${order.shipping_address.province} ${destinationZip}`
      : destinationZip;

    if (install.auto_book && status === 'booked') {
      await postSlackMessage(install.slack_webhook, {
        text: `✅ Freight booked for Shopify order ${order.name}`,
        attachments: [
          {
            color: '#2EB67D',
            blocks: [
              {
                type: 'header',
                text: { type: 'plain_text', text: '📦 Order Fulfilled', emoji: true },
              },
              {
                type: 'section',
                fields: [
                  { type: 'mrkdwn', text: `*Order*\n${order.name}` },
                  { type: 'mrkdwn', text: `*Destination*\n${destination}` },
                  {
                    type: 'mrkdwn',
                    text: `*Amount*\n$${quote.total_amount?.toFixed(2) ?? 'N/A'}`,
                  },
                  { type: 'mrkdwn', text: `*Tracking*\n${trackingNumber ?? 'Pending'}` },
                  { type: 'mrkdwn', text: `*Mode*\nWarp LTL` },
                  {
                    type: 'mrkdwn',
                    text: `*ETA*\n${quote.transit_days ?? 'N/A'} business days`,
                  },
                ],
              },
            ],
          },
        ],
      });
    } else if (!install.auto_book) {
      // Post quote info to Slack
      await postSlackMessage(install.slack_webhook, {
        text: `📋 Freight quote ready for Shopify order ${order.name}`,
        attachments: [
          {
            color: '#E2A72E',
            blocks: [
              {
                type: 'header',
                text: { type: 'plain_text', text: '📦 New Paid Order — Quote Ready', emoji: true },
              },
              {
                type: 'section',
                fields: [
                  { type: 'mrkdwn', text: `*Order*\n${order.name}` },
                  { type: 'mrkdwn', text: `*Destination*\n${destination}` },
                  {
                    type: 'mrkdwn',
                    text: `*Quote Amount*\n$${quote.total_amount?.toFixed(2) ?? 'N/A'}`,
                  },
                  {
                    type: 'mrkdwn',
                    text: `*Transit Time*\n${quote.transit_days ?? 'N/A'} business days`,
                  },
                  { type: 'mrkdwn', text: `*Mode*\nWarp LTL` },
                  { type: 'mrkdwn', text: `*Weight*\n${weightLbs.toFixed(1)} lbs` },
                ],
              },
              {
                type: 'section',
                text: {
                  type: 'mrkdwn',
                  text: '_Auto-book is disabled. Log in to your settings to book manually._',
                },
              },
            ],
          },
        ],
      });
    }
  }

  return NextResponse.json({ ok: true, status });
}
