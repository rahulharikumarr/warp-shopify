import { NextRequest, NextResponse } from 'next/server';
import { generateNonce, getAuthUrl } from '@/lib/shopify';

// In production, use Redis or DB for nonce storage
// For simplicity, we encode the nonce in a cookie
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const shop = searchParams.get('shop');

  if (!shop) {
    return NextResponse.json({ error: 'Missing shop parameter' }, { status: 400 });
  }

  // Validate shop domain
  if (!shop.match(/^[a-zA-Z0-9][a-zA-Z0-9\-]*\.myshopify\.com$/)) {
    return NextResponse.json({ error: 'Invalid shop domain' }, { status: 400 });
  }

  const nonce = generateNonce();
  const authUrl = getAuthUrl(shop, nonce);

  const response = NextResponse.redirect(authUrl);
  // Store nonce in cookie for verification
  response.cookies.set('shopify_nonce', nonce, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600, // 10 minutes
  });
  response.cookies.set('shopify_shop', shop, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600,
  });

  return response;
}
