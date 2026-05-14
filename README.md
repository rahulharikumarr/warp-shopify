# Warp Shopify App

A Vercel-hosted Next.js app that connects Shopify merchants to Warp freight. When an order is paid, it automatically quotes Warp LTL, books the best option, and posts a Slack notification with tracking info.

## Stack

- **Next.js 15** App Router + TypeScript
- **@vercel/postgres** (Neon) for storing shop installs + settings
- **Tailwind CSS** (dark theme, minimal)
- **Deployed to Vercel** under rahulharikumarr account

## Features

- 🛍️ Shopify OAuth install flow
- 📦 Auto-quote Warp LTL on every paid order
- ✅ Auto-book or quote-only mode
- 🔔 Slack notifications with tracking & ETA
- ⚡ Fastest or 💰 cheapest carrier preference
- 📊 Booking history dashboard

## Environment Variables

Set these in Vercel (or `.env.local` for local dev):

| Variable | Description |
|---|---|
| `SHOPIFY_API_KEY` | From Shopify Partners dashboard |
| `SHOPIFY_API_SECRET` | From Shopify Partners dashboard |
| `APP_URL` | Full URL of this app (e.g. `https://warp-shopify.vercel.app`) |
| `POSTGRES_URL` | Neon/Vercel Postgres connection string |

## Setup

### 1. Shopify Partner App

1. Go to [Shopify Partners](https://partners.shopify.com)
2. Create a new app → select **Public app**
3. Set the App URL to `APP_URL`
4. Set the Redirect URL to `APP_URL/api/auth/callback`
5. Copy the **API key** and **API secret** to your env vars

### 2. Database

The app uses `@vercel/postgres` (Neon). Connect a Postgres database in your Vercel project dashboard. The tables are auto-created on first OAuth callback.

### 3. Deploy to Vercel

```bash
vercel --prod
```

## API Routes

| Route | Method | Description |
|---|---|---|
| `/api/auth` | GET | Initiates Shopify OAuth |
| `/api/auth/callback` | GET | Handles OAuth callback, saves install |
| `/api/webhooks/orders-paid` | POST | Processes paid orders, quotes/books Warp |
| `/api/settings` | POST | Updates shop settings |
| `/api/settings/get` | GET | Fetches shop settings + recent bookings |

## Pages

- `/` — Install landing page
- `/settings?shop=xxx.myshopify.com` — Shop settings & booking history

## Local Development

```bash
cp .env.example .env.local
# Fill in your env vars
npm run dev
```

Use [ngrok](https://ngrok.com) to expose your local server so Shopify can reach the OAuth callback and webhooks.

## Architecture

```
Shopify Order Paid
      ↓
POST /api/webhooks/orders-paid
      ↓
Verify HMAC → Load shop config
      ↓
Quote Warp LTL → (auto_book?) → Book Warp
      ↓
Save to DB → Post Slack notification
```
