import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForToken, registerWebhook, verifyCallbackHmac } from '@/lib/shopify';
import { upsertShopInstall, initDb } from '@/lib/db';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const shop = searchParams.get('shop');
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const hmac = searchParams.get('hmac');

  if (!shop || !code || !state || !hmac) {
    return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
  }

  // Verify state nonce
  const storedNonce = request.cookies.get('shopify_nonce')?.value;
  if (!storedNonce || storedNonce !== state) {
    return NextResponse.json({ error: 'Invalid state nonce' }, { status: 403 });
  }

  // Verify HMAC signature
  const query: Record<string, string> = {};
  searchParams.forEach((value, key) => {
    query[key] = value;
  });

  if (!verifyCallbackHmac(query)) {
    return NextResponse.json({ error: 'Invalid HMAC signature' }, { status: 403 });
  }

  try {
    // Exchange code for access token
    const accessToken = await exchangeCodeForToken(shop, code);

    // Initialize DB and save install
    await initDb();
    await upsertShopInstall(shop, accessToken);

    // Register orders/paid webhook
    await registerWebhook(shop, accessToken);

    // Redirect to settings
    const response = NextResponse.redirect(
      `${process.env.APP_URL}/settings?shop=${encodeURIComponent(shop)}`
    );

    // Clear nonce cookie
    response.cookies.delete('shopify_nonce');
    response.cookies.delete('shopify_shop');

    return response;
  } catch (err) {
    console.error('OAuth callback error:', err);
    return NextResponse.json(
      { error: 'Failed to complete OAuth flow' },
      { status: 500 }
    );
  }
}
