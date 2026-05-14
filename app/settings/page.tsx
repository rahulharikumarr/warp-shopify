'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

interface Booking {
  id: number;
  order_id: string;
  warp_order_id: string | null;
  tracking_number: string | null;
  amount: number | null;
  status: string;
  created_at: string;
}

interface Settings {
  warp_api_key: string;
  slack_webhook: string;
  auto_book: boolean;
  carrier_preference: string;
  bookings: Booking[];
}

function SettingsContent() {
  const searchParams = useSearchParams();
  const shop = searchParams.get('shop') ?? '';

  const [settings, setSettings] = useState<Settings>({
    warp_api_key: '',
    slack_webhook: '',
    auto_book: true,
    carrier_preference: 'fastest',
    bookings: [],
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchSettings = useCallback(async () => {
    if (!shop) return;
    try {
      const res = await fetch(`/api/settings/get?shop=${encodeURIComponent(shop)}`);
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
      }
    } catch {
      setError('Failed to load settings');
    } finally {
      setLoading(false);
    }
  }, [shop]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shop, ...settings }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch {
      setError('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-3xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 10V7" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold">Warp Freight Settings</h1>
            <p className="text-sm text-gray-500">{shop}</p>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-900/30 border border-red-700 rounded-xl text-red-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6">
          {/* Warp API Key */}
          <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6">
            <h2 className="text-lg font-semibold mb-4">Warp Configuration</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Warp API Key
                </label>
                <input
                  type="password"
                  value={settings.warp_api_key}
                  onChange={(e) => setSettings({ ...settings, warp_api_key: e.target.value })}
                  placeholder="••••••••••••••••"
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Slack Webhook URL
                </label>
                <input
                  type="url"
                  value={settings.slack_webhook}
                  onChange={(e) => setSettings({ ...settings, slack_webhook: e.target.value })}
                  placeholder="https://hooks.slack.com/services/..."
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                />
              </div>
            </div>
          </div>

          {/* Booking Preferences */}
          <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6">
            <h2 className="text-lg font-semibold mb-4">Booking Preferences</h2>
            <div className="space-y-4">
              {/* Auto-book toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Auto-book</p>
                  <p className="text-sm text-gray-500">Automatically book freight on every paid order</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSettings({ ...settings, auto_book: !settings.auto_book })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    settings.auto_book ? 'bg-blue-600' : 'bg-gray-700'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      settings.auto_book ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Carrier preference */}
              <div>
                <p className="font-medium mb-2">Carrier Preference</p>
                <div className="flex gap-3">
                  {['fastest', 'cheapest'].map((pref) => (
                    <label
                      key={pref}
                      className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border cursor-pointer transition-colors ${
                        settings.carrier_preference === pref
                          ? 'bg-blue-600/20 border-blue-500 text-blue-400'
                          : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600'
                      }`}
                    >
                      <input
                        type="radio"
                        name="carrier_preference"
                        value={pref}
                        checked={settings.carrier_preference === pref}
                        onChange={(e) => setSettings({ ...settings, carrier_preference: e.target.value })}
                        className="sr-only"
                      />
                      <span>{pref === 'fastest' ? '⚡' : '💰'}</span>
                      <span className="capitalize">{pref}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Save button */}
          <button
            type="submit"
            disabled={saving}
            className="w-full py-3 px-6 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold rounded-xl transition-colors"
          >
            {saving ? 'Saving...' : saved ? '✓ Saved!' : 'Save Settings'}
          </button>
        </form>

        {/* Recent Bookings */}
        <div className="mt-10">
          <h2 className="text-lg font-semibold mb-4">Recent Bookings</h2>
          {settings.bookings.length === 0 ? (
            <div className="bg-gray-900 rounded-2xl border border-gray-800 p-8 text-center text-gray-500">
              No bookings yet. Bookings will appear here after orders are processed.
            </div>
          ) : (
            <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800 text-gray-400">
                    <th className="text-left px-4 py-3">Order</th>
                    <th className="text-left px-4 py-3">Status</th>
                    <th className="text-left px-4 py-3">Amount</th>
                    <th className="text-left px-4 py-3">Tracking</th>
                    <th className="text-left px-4 py-3">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {settings.bookings.map((booking) => (
                    <tr key={booking.id} className="border-b border-gray-800/50 last:border-0">
                      <td className="px-4 py-3 font-mono text-xs">{booking.order_id}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-1 rounded-md text-xs font-medium ${
                            booking.status === 'booked'
                              ? 'bg-green-900/40 text-green-400'
                              : booking.status === 'quoted'
                              ? 'bg-yellow-900/40 text-yellow-400'
                              : 'bg-red-900/40 text-red-400'
                          }`}
                        >
                          {booking.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {booking.amount ? `$${Number(booking.amount).toFixed(2)}` : '—'}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">
                        {booking.tracking_number ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {new Date(booking.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-950 flex items-center justify-center text-gray-400">Loading...</div>}>
      <SettingsContent />
    </Suspense>
  );
}
