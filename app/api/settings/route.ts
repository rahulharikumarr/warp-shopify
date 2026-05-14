import { NextRequest, NextResponse } from 'next/server';
import { updateShopSettings, getShopInstall } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { shop, warp_api_key, slack_webhook, auto_book, carrier_preference } = body;

    if (!shop) {
      return NextResponse.json({ error: 'Missing shop' }, { status: 400 });
    }

    // Verify shop exists
    const install = await getShopInstall(shop);
    if (!install) {
      return NextResponse.json({ error: 'Shop not found' }, { status: 404 });
    }

    await updateShopSettings(
      shop,
      warp_api_key || null,
      slack_webhook || null,
      Boolean(auto_book),
      carrier_preference || 'fastest'
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Settings update error:', err);
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}
