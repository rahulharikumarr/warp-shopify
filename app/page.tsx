'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const [shop, setShop] = useState('');
  const router = useRouter();

  const handleInstall = (e: React.FormEvent) => {
    e.preventDefault();
    let shopDomain = shop.trim().toLowerCase();
    if (!shopDomain.endsWith('.myshopify.com')) {
      shopDomain = `${shopDomain}.myshopify.com`;
    }
    router.push(`/api/auth?shop=${encodeURIComponent(shopDomain)}`);
  };

  return (
    <main className="min-h-screen bg-gray-950 text-white flex items-center justify-center px-4">
      <div className="max-w-lg w-full">
        {/* Logo / Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 10V7" />
              </svg>
            </div>
            <span className="text-2xl font-bold tracking-tight">Warp × Shopify</span>
          </div>
          <h1 className="text-3xl font-bold mb-3">
            Connect Shopify to Warp Freight
          </h1>
          <p className="text-gray-400 text-lg">
            Auto-book freight on every paid order. Get Slack alerts with tracking.
          </p>
        </div>

        {/* Feature bullets */}
        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6 mb-8 space-y-3">
          {[
            { icon: '⚡', text: 'Instant LTL quotes on every paid Shopify order' },
            { icon: '📦', text: 'Auto-book the best rate — fastest or cheapest' },
            { icon: '🔔', text: 'Slack notifications with tracking number & ETA' },
            { icon: '📊', text: 'Booking history dashboard in your settings' },
          ].map((f, i) => (
            <div key={i} className="flex items-center gap-3 text-gray-300">
              <span className="text-xl">{f.icon}</span>
              <span>{f.text}</span>
            </div>
          ))}
        </div>

        {/* Install form */}
        <form onSubmit={handleInstall} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Your Shopify Store Domain
            </label>
            <input
              type="text"
              value={shop}
              onChange={(e) => setShop(e.target.value)}
              placeholder="mystore.myshopify.com"
              required
              className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
            />
          </div>
          <button
            type="submit"
            className="w-full py-3 px-6 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition-colors duration-200"
          >
            Install App →
          </button>
        </form>

        <p className="text-center text-gray-600 text-sm mt-6">
          Requires Shopify store owner access
        </p>
      </div>
    </main>
  );
}
