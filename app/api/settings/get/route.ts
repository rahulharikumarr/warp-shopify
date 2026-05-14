import { NextRequest, NextResponse } from 'next/server';
import { getShopInstall, getRecentBookings } from '@/lib/db';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const shop = searchParams.get('shop');

  if (!shop) {
    return NextResponse.json({ error: 'Missing shop' }, { status: 400 });
  }

  const install = await getShopInstall(shop);
  if (!install) {
    return NextResponse.json({ error: 'Shop not found' }, { status: 404 });
  }

  const bookings = await getRecentBookings(shop, 10);

  return NextResponse.json({
    warp_api_key: install.warp_api_key ?? '',
    slack_webhook: install.slack_webhook ?? '',
    auto_book: install.auto_book,
    carrier_preference: install.carrier_preference ?? 'fastest',
    bookings,
  });
}
